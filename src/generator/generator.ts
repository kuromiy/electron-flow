import type { ParsedHandler, GenerationTarget, GeneratedCode, TypeInfo, ParameterInfo } from './types';

/**
 * IPCコード生成エンジン
 */
export class Generator {
  /**
   * ハンドラーからIPCコードを生成する
   */
  generateCode(handlers: ParsedHandler[], target: GenerationTarget): GeneratedCode {
    switch (target) {
      case 'main':
        return this.generateMainProcess(handlers);
      case 'preload':
        return this.generatePreload(handlers);
      case 'renderer':
        return this.generateRenderer(handlers);
      default:
        throw new Error(`サポートされていないターゲット: ${target}`);
    }
  }

  /**
   * メインプロセス用のコードを生成する
   */
  private generateMainProcess(handlers: ParsedHandler[]): GeneratedCode {
    const imports = [
      "import { ipcMain, IpcMainInvokeEvent } from 'electron';",
      "import { success, failure, handleError } from 'electron-flow/runtime';",
      "import type { Context } from './context';",
    ];

    const handlerImports = handlers.map(handler => {
      const handlerName = handler.name;
      const relativePath = this.getRelativePath(handler.filePath);
      return `import { ${handlerName} } from '${relativePath}';`;
    });

    const code = handlers.map(handler => this.generateMainHandler(handler)).join('\\n\\n');

    const types: string[] = [];

    return {
      target: 'main',
      code,
      imports: [...imports, ...handlerImports],
      types,
    };
  }

  /**
   * メインプロセスのハンドラーを生成する
   */
  private generateMainHandler(handler: ParsedHandler): string {
    const { name, parameters } = handler;
    const channelName = this.getChannelName(name);
    
    // パラメータの型チェック
    const paramValidation = parameters.length > 0 
      ? this.generateParameterValidation(parameters)
      : '';

    const handlerCall = parameters.length > 0
      ? `await ${name}({ ...ctx, event }, args)`
      : `await ${name}({ ...ctx, event })`;

    return `
// ${handler.documentation || `${name}ハンドラー`}
ipcMain.handle('${channelName}', async (event: IpcMainInvokeEvent, args: any) => {
  const ctx: Context = {
    // TODO: コンテキストの実装
  };

  try {
    ${paramValidation}
    const result = ${handlerCall};
    return success(result);
  } catch (e) {
    return handleError({ ...ctx, event }, e);
  }
});`.trim();
  }

  /**
   * プリロード用のコードを生成する
   */
  private generatePreload(handlers: ParsedHandler[]): GeneratedCode {
    const imports = [
      "import { contextBridge, ipcRenderer } from 'electron';",
      "import type { Result } from 'electron-flow/runtime';",
    ];

    const apiMethods = handlers.map(handler => this.generatePreloadMethod(handler));
    
    const code = `
const electronFlowApi = {
${apiMethods.map(method => `  ${method}`).join(',\\n')}
};

contextBridge.exposeInMainWorld('electronFlow', electronFlowApi);

export type ElectronFlowApi = typeof electronFlowApi;`.trim();

    const types = handlers.map(handler => this.generateTypeDefinition(handler));

    return {
      target: 'preload',
      code,
      imports,
      types,
    };
  }

  /**
   * プリロードのメソッドを生成する
   */
  private generatePreloadMethod(handler: ParsedHandler): string {
    const { name, parameters, returnType } = handler;
    const channelName = this.getChannelName(name);
    
    const paramTypes = parameters.map(p => `${p.name}${p.optional ? '?' : ''}: ${this.getTypeString(p.type)}`);
    const paramString = paramTypes.join(', ');
    
    const returnTypeString = this.getReturnTypeString(returnType);
    
    const argsParam = parameters.length > 0 ? 'args' : 'undefined';
    const methodParams = parameters.length > 0 ? `args: { ${paramString} }` : '';

    return `${name}: (${methodParams}): Promise<${returnTypeString}> => {
    return ipcRenderer.invoke('${channelName}', ${argsParam});
  }`;
  }

  /**
   * レンダラー用のコードを生成する
   */
  private generateRenderer(handlers: ParsedHandler[]): GeneratedCode {
    const imports = [
      "import type { ElectronFlowApi } from './preload';",
    ];

    const code = `
declare global {
  interface Window {
    electronFlow: ElectronFlowApi;
  }
}

export const electronFlow = window.electronFlow;`.trim();

    const types = handlers.map(handler => this.generateRendererTypeDefinition(handler));

    return {
      target: 'renderer',
      code,
      imports,
      types,
    };
  }

  /**
   * パラメータのバリデーションコードを生成する
   */
  private generateParameterValidation(parameters: ParameterInfo[]): string {
    // 簡易実装 - 実際にはより詳細なバリデーションが必要
    const validations = parameters
      .filter(p => !p.optional)
      .map(p => `if (args.${p.name} === undefined) throw new Error('${p.name}は必須です');`);

    return validations.length > 0 ? validations.join('\\n    ') : '';
  }

  /**
   * 型定義を生成する
   */
  private generateTypeDefinition(handler: ParsedHandler): string {
    const { name, parameters, returnType } = handler;
    const paramTypes = parameters.map(p => `${p.name}${p.optional ? '?' : ''}: ${this.getTypeString(p.type)}`);
    const returnTypeString = this.getReturnTypeString(returnType);

    return `export type ${this.capitalize(name)}Args = { ${paramTypes.join('; ')} };
export type ${this.capitalize(name)}Result = ${returnTypeString};`;
  }

  /**
   * レンダラー用の型定義を生成する
   */
  private generateRendererTypeDefinition(handler: ParsedHandler): string {
    // プリロードと同じ型定義を使用
    return this.generateTypeDefinition(handler);
  }

  /**
   * 型情報から型文字列を取得する
   */
  private getTypeString(type: TypeInfo): string {
    switch (type.kind) {
      case 'primitive':
        return type.name;
      case 'array':
        return type.elementType ? `${this.getTypeString(type.elementType)}[]` : 'any[]';
      case 'promise':
        const promiseArg = type.typeArguments?.[0];
        return promiseArg ? `Promise<${this.getTypeString(promiseArg)}>` : 'Promise<any>';
      case 'result':
        const resultArg = type.typeArguments?.[0];
        return resultArg ? `Result<${this.getTypeString(resultArg)}>` : 'Result<any>';
      case 'union':
        return type.unionTypes?.map(t => this.getTypeString(t)).join(' | ') || 'any';
      case 'object':
        return type.name;
      case 'generic':
        return type.name;
      default:
        return 'any';
    }
  }

  /**
   * 戻り値の型文字列を取得する
   */
  private getReturnTypeString(returnType: TypeInfo): string {
    // Result型でラップ
    if (returnType.kind === 'promise') {
      const innerType = returnType.typeArguments?.[0];
      if (innerType) {
        return `Result<${this.getTypeString(innerType)}>`;
      }
    }
    
    return `Result<${this.getTypeString(returnType)}>`;
  }

  /**
   * チャンネル名を取得する
   */
  private getChannelName(handlerName: string): string {
    return handlerName;
  }

  /**
   * 相対パスを取得する（簡易実装）
   */
  private getRelativePath(filePath: string): string {
    // TODO: 実際のパス計算を実装
    return filePath.replace(/\\.ts$/, '');
  }

  /**
   * 文字列の最初の文字を大文字にする
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}