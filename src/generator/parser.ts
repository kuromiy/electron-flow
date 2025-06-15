import { Project, FunctionDeclaration, ParameterDeclaration, TypeNode, JSDoc } from 'ts-morph';
import type { ParsedHandler, ParameterInfo, TypeInfo, TypeKind } from './types';
import { ElectronFlowError } from '../cli/error-handler';

/**
 * TypeScript AST解析パーサー
 */
export class Parser {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // ES2020
        module: 1,  // CommonJS
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
    });
  }

  /**
   * ハンドラーディレクトリから関数を解析する
   */
  async parseHandlers(handlersDir: string): Promise<ParsedHandler[]> {
    try {
      // ハンドラーディレクトリのTSファイルを読み込み
      this.project.addSourceFilesAtPaths(`${handlersDir}/**/*.ts`);

      const handlers: ParsedHandler[] = [];

      // 各ソースファイルを解析
      for (const sourceFile of this.project.getSourceFiles()) {
        const filePath = sourceFile.getFilePath();
        
        // エクスポートされた関数を取得
        const functions = sourceFile.getFunctions();
        for (const func of functions) {
          if (func.isExported()) {
            const parsed = this.parseFunctionDeclaration(func, filePath);
            if (parsed) {
              handlers.push(parsed);
            }
          }
        }

        // 名前付きエクスポートも確認
        const exportedDeclarations = sourceFile.getExportedDeclarations();
        for (const [, declarations] of exportedDeclarations) {
          for (const declaration of declarations) {
            if (declaration instanceof FunctionDeclaration) {
              const parsed = this.parseFunctionDeclaration(declaration, filePath);
              if (parsed) {
                handlers.push(parsed);
              }
            }
          }
        }
      }

      return handlers;
    } catch (error) {
      throw new ElectronFlowError(
        `ハンドラーの解析に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        'PARSE_FAILED'
      );
    }
  }

  /**
   * 関数宣言を解析する
   */
  private parseFunctionDeclaration(
    func: FunctionDeclaration, 
    filePath: string
  ): ParsedHandler | null {
    const name = func.getName();
    if (!name) {
      return null;
    }

    // パラメータを解析
    const parameters: ParameterInfo[] = func.getParameters().map(param => 
      this.parseParameter(param)
    );

    // 戻り値の型を解析
    const returnTypeNode = func.getReturnTypeNode();
    const returnType = returnTypeNode 
      ? this.parseTypeNode(returnTypeNode)
      : this.inferReturnType(func);

    // JSDocコメントを取得
    const jsDocs = func.getJsDocs();
    const documentation = jsDocs.length > 0 
      ? this.extractJSDocText(jsDocs[0])
      : undefined;

    return {
      name,
      parameters,
      returnType,
      filePath,
      documentation,
    };
  }

  /**
   * パラメータを解析する
   */
  private parseParameter(param: ParameterDeclaration): ParameterInfo {
    const name = param.getName();
    const optional = param.hasQuestionToken();
    const typeNode = param.getTypeNode();
    const defaultValue = param.getInitializer()?.getText();

    const type = typeNode 
      ? this.parseTypeNode(typeNode)
      : this.createUnknownType();

    return {
      name,
      type,
      optional,
      defaultValue,
    };
  }

  /**
   * 型ノードを解析する
   */
  private parseTypeNode(typeNode: TypeNode): TypeInfo {
    const typeText = typeNode.getText();
    
    // プリミティブ型
    if (['string', 'number', 'boolean', 'void', 'null', 'undefined'].includes(typeText)) {
      return {
        name: typeText,
        kind: 'primitive',
      };
    }

    // Promise型
    if (typeText.startsWith('Promise<')) {
      const innerType = this.extractGenericArgument(typeText, 'Promise');
      return {
        name: 'Promise',
        kind: 'promise',
        typeArguments: innerType ? [this.parseTypeText(innerType)] : [],
      };
    }

    // Result型
    if (typeText.startsWith('Result<')) {
      const innerType = this.extractGenericArgument(typeText, 'Result');
      return {
        name: 'Result',
        kind: 'result',
        typeArguments: innerType ? [this.parseTypeText(innerType)] : [],
      };
    }

    // 配列型
    if (typeText.endsWith('[]')) {
      const elementType = typeText.slice(0, -2);
      return {
        name: 'Array',
        kind: 'array',
        elementType: this.parseTypeText(elementType),
      };
    }

    // ユニオン型
    if (typeText.includes(' | ')) {
      const unionTypes = typeText.split(' | ').map(type => 
        this.parseTypeText(type.trim())
      );
      return {
        name: typeText,
        kind: 'union',
        unionTypes,
      };
    }

    // オブジェクト型（簡易実装）
    if (typeText.startsWith('{') && typeText.endsWith('}')) {
      return {
        name: typeText,
        kind: 'object',
        properties: [], // TODO: プロパティの詳細解析
      };
    }

    // その他の型
    return {
      name: typeText,
      kind: 'generic',
    };
  }

  /**
   * 型テキストから型情報を作成する
   */
  private parseTypeText(typeText: string): TypeInfo {
    // 簡易実装 - 実際にはより詳細な解析が必要
    return {
      name: typeText,
      kind: this.inferTypeKind(typeText),
    };
  }

  /**
   * 型の種類を推論する
   */
  private inferTypeKind(typeText: string): TypeKind {
    if (['string', 'number', 'boolean', 'void'].includes(typeText)) {
      return 'primitive';
    }
    if (typeText.startsWith('Promise<')) {
      return 'promise';
    }
    if (typeText.startsWith('Result<')) {
      return 'result';
    }
    if (typeText.endsWith('[]')) {
      return 'array';
    }
    if (typeText.includes(' | ')) {
      return 'union';
    }
    if (typeText.startsWith('{')) {
      return 'object';
    }
    return 'generic';
  }

  /**
   * 戻り値の型を推論する
   */
  private inferReturnType(func: FunctionDeclaration): TypeInfo {
    // 簡易実装 - async関数はPromise型と推論
    if (func.isAsync()) {
      return {
        name: 'Promise',
        kind: 'promise',
        typeArguments: [this.createUnknownType()],
      };
    }

    return this.createUnknownType();
  }

  /**
   * ジェネリック型の引数を抽出する
   */
  private extractGenericArgument(typeText: string, genericName: string): string | null {
    const pattern = new RegExp(`${genericName}<(.+)>$`);
    const match = typeText.match(pattern);
    return match ? match[1] : null;
  }

  /**
   * JSDocテキストを抽出する
   */
  private extractJSDocText(jsDoc: JSDoc): string {
    return jsDoc.getDescription();
  }

  /**
   * 不明な型を作成する
   */
  private createUnknownType(): TypeInfo {
    return {
      name: 'unknown',
      kind: 'unknown',
    };
  }
}