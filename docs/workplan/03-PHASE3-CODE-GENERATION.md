# Phase 3: コード生成エンジン

## 1. フェーズ概要

### 目標
Phase 2で解析したTypeScript API情報を基に、Electron IPC通信に必要な3種類のコード（プリロード、ハンドラー、型定義）を自動生成する機能を実装する。
Zodスキーマによるバリデーションはユーザー側のAPI実装内で行うことを前提とする。

### 期間
**2週間** (10営業日)

### 主要成果物
- **format.ts**: コード生成エンジン
- **templates/**: コード生成テンプレート
- **generators/**: 各種ジェネレーター
- 生成コードの検証システム

## 2. 詳細タスクリスト

### 2.1 Week 1: コード生成基盤とテンプレートシステム

#### タスク 3.1: テンプレートシステム設計 (Day 1)
**所要時間**: 6時間

**テンプレート構造定義**:
```typescript
interface CodeTemplate {
  preload: {
    header: string;           // ファイルヘッダー
    apiFunction: string;      // API関数テンプレート
    footer: string;          // ファイルフッター
  };
  handler: {
    header: string;          // インポート文等
    handlerFunction: string; // ハンドラー関数テンプレート
    errorHandler: string;    // エラーハンドリング
    footer: string;         // エクスポート文等
  };
  types: {
    header: string;         // 型定義ヘッダー
    interface: string;      // インターフェース定義
    resultType: string;     // Result型定義
    footer: string;         // フッター
  };
}
```

**テンプレートファイル例**:
```typescript
// templates/preload.template.ts
const PRELOAD_TEMPLATE = `
import { ipcRenderer } from 'electron';

export const electronAPI = {
{{#each functions}}
  {{name}}: ({{#each parameters}}{{name}}: {{type}}{{#unless @last}}, {{/unless}}{{/each}}) =>
    ipcRenderer.invoke('{{name}}'{{#if parameters}}, {{#each parameters}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}),
{{/each}}
};
`;
```

**完了基準**: テンプレートシステムの基本構造が定義され、サンプルテンプレートが作成される

#### タスク 3.2: プリロードスクリプト生成機能 (Day 2-3)
**所要時間**: 12時間

**実装対象**:
```typescript
class PreloadGenerator {
  generate(packages: PackageInfo[]): string {
    const functions = this.extractAllFunctions(packages);
    const template = this.loadPreloadTemplate();
    
    return this.renderTemplate(template, {
      functions: functions.map(fn => this.transformFunctionForPreload(fn)),
      imports: this.generateImports(packages),
      timestamp: new Date().toISOString()
    });
  }
  
  private transformFunctionForPreload(fn: FunctionInfo): PreloadFunctionData {
    return {
      name: fn.name,
      parameters: fn.parameters.filter(p => p.name !== 'ctx'), // Contextを除外
      ipcChannel: fn.name,
      returnType: this.extractReturnType(fn.returnType)
    };
  }
}
```

**生成例**:
```typescript
// 生成されるプリロードスクリプト
import { ipcRenderer } from 'electron';

export const electronAPI = {
  createUser: (request: CreateUserRequest) =>
    ipcRenderer.invoke('createUser', request),
  
  getUsers: () =>
    ipcRenderer.invoke('getUsers'),
  
  updateUser: (id: string, request: UpdateUserRequest) =>
    ipcRenderer.invoke('updateUser', id, request)
};

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
```

**完了基準**: 解析されたAPI関数から正確なプリロードスクリプトが生成される

#### タスク 3.3: IPCハンドラー生成機能 (Day 4-5)
**所要時間**: 12時間

**実装対象**:
```typescript
class HandlerGenerator {
  generate(
    packages: PackageInfo[], 
    errorHandlerConfig?: ErrorHandlerConfig
  ): string {
    const handlers = packages.flatMap(pkg => 
      pkg.functions.map(fn => this.generateHandler(fn))
    );
    
    return this.renderHandlerTemplate({
      imports: this.generateImports(packages),
      handlers: handlers,
      errorHandler: this.generateErrorHandler(errorHandlerConfig)
    });
  }
  
  private generateHandler(fn: FunctionInfo): HandlerData {
    return {
      name: fn.name,
      importPath: fn.importPath,
      parameters: this.processParameters(fn.parameters),
      hasContext: this.hasContextParameter(fn),
      isAsync: fn.isAsync
    };
  }
}
```

**生成例**:
```typescript
// 生成されるハンドラー
import { IpcMainInvokeEvent } from 'electron';
import { createUser, getUsers } from '../api/users';
import { Context } from '../types/context';

// 注意: Zodスキーマを使用したバリデーションは
// ユーザー側のAPI実装内で行ってください

export const autoGenerateHandlers = {
  "createUser": (baseCtx: Omit<Context, "event">) => {
    return async (event: IpcMainInvokeEvent, request: any) => {
      const ctx: Context = { ...baseCtx, event };
      
      try {
        // API関数実行（バリデーションはAPI内で実施）
        const result = await createUser(ctx, request);
        
        return { success: true, data: result };
      } catch (error) {
        return handleError(error, ctx);
      }
    };
  },
  
  "getUsers": (baseCtx: Omit<Context, "event">) => {
    return async (event: IpcMainInvokeEvent) => {
      const ctx: Context = { ...baseCtx, event };
      
      try {
        const result = await getUsers(ctx);
        return { success: true, data: result };
      } catch (error) {
        return handleError(error, ctx);
      }
    };
  }
};
```

**完了基準**: 型安全でエラーハンドリングを含むハンドラーコードが生成される

### 2.2 Week 2: 型定義生成と統合

#### タスク 3.4: 型定義生成機能 (Day 6-7)
**所要時間**: 12時間

**実装対象**:
```typescript
class TypeDefinitionGenerator {
  generate(
    packages: PackageInfo[]
  ): string {
    return this.renderTypeTemplate({
      electronAPI: this.generateElectronAPIInterface(packages),
      resultTypes: this.generateResultTypes(packages),
      imports: this.generateTypeImports(packages)
    });
  }
  
  private generateElectronAPIInterface(packages: PackageInfo[]): string {
    const functions = packages.flatMap(pkg => pkg.functions);
    
    const interfaceBody = functions.map(fn => {
      const params = fn.parameters
        .filter(p => p.name !== 'ctx')
        .map(p => `${p.name}: ${p.type.text}`)
        .join(', ');
      
      const returnType = this.wrapWithResult(fn.returnType);
      
      return `  ${fn.name}: (${params}) => Promise<${returnType}>;`;
    }).join('\n');
    
    return `interface ElectronAPI {\n${interfaceBody}\n}`;
  }
}
```

**生成例**:
```typescript
// 生成される型定義
import { CreateUserRequest, UpdateUserRequest } from '../api/users';

type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: ErrorDetails };

interface ErrorDetails {
  message: string;
  type: string;
  details?: any;
}

interface ElectronAPI {
  createUser: (request: CreateUserRequest) => Promise<Result<User>>;
  getUsers: () => Promise<Result<User[]>>;
  updateUser: (id: string, request: UpdateUserRequest) => Promise<Result<User>>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

**完了基準**: 完全な型安全性を保つ型定義ファイルが生成される

#### タスク 3.5: エラーハンドリング生成機能 (Day 8)
**所要時間**: 6時間

**実装対象**:
```typescript
class ErrorHandlerGenerator {
  generateErrorHandler(config?: ErrorHandlerConfig): string {
    if (config) {
      return this.generateCustomErrorHandler(config);
    } else {
      return this.generateDefaultErrorHandler();
    }
  }
  
  private generateCustomErrorHandler(config: ErrorHandlerConfig): string {
    return `
import { ${config.handlerName} } from '${config.handlerPath}';

function handleError(error: Error, ctx: Context): Result<never> {
  try {
    return ${config.handlerName}(error, ctx);
  } catch (handlerError) {
    ${config.defaultHandler ? 'return defaultErrorHandler(error, ctx);' : 'throw handlerError;'}
  }
}
    `;
  }
  
  private generateDefaultErrorHandler(): string {
    return `
function handleError(error: Error, ctx: Context): Result<never> {
  return {
    success: false,
    error: {
      message: error.message || 'Unknown error',
      type: error.constructor.name,
      timestamp: new Date().toISOString()
    }
  };
}
    `;
  }
}
```

**完了基準**: カスタムエラーハンドラーに対応した柔軟なエラー処理コードが生成される

#### タスク 3.6: コード品質とフォーマット (Day 9)
**所要時間**: 6時間

**実装対象**:
```typescript
class CodeFormatter {
  format(code: string, type: 'typescript' | 'javascript'): string {
    // Prettierを使用したコードフォーマット
    return prettier.format(code, {
      parser: type === 'typescript' ? 'typescript' : 'javascript',
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 80,
      tabWidth: 2
    });
  }
  
  addFileHeader(code: string, metadata: FileMetadata): string {
    const header = `
/**
 * Auto-generated by electron-flow
 * Generated at: ${metadata.timestamp}
 * Source: ${metadata.sourcePath}
 * 
 * DO NOT MODIFY THIS FILE DIRECTLY
 * This file is automatically generated and will be overwritten
 */
    `;
    
    return header + '\n' + code;
  }
  
  validateGeneratedCode(code: string): ValidationResult {
    // TypeScriptコンパイラーでの構文チェック
    const result = ts.transpile(code, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext
    });
    
    return {
      isValid: !result.diagnostics?.length,
      errors: result.diagnostics || []
    };
  }
}
```

**完了基準**: 生成されるコードが適切にフォーマットされ、構文的に正しい

#### タスク 3.7: 統合検証と最終確認 (Day 10)
**所要時間**: 6時間

**検証ケース**:
```typescript
// サンプルデータ作成
const samplePackage: PackageInfo = {
  packageName: 'users',
  functions: [
    {
      name: 'createUser',
      parameters: [
        { name: 'ctx', type: { text: 'Context' }, isOptional: false },
        { name: 'request', type: { text: 'CreateUserRequest' }, isOptional: false }
      ],
      returnType: { text: 'Promise<User>', isPromise: true },
      isAsync: true
    }
  ]
};

// プリロードスクリプト検証
const preloadGenerator = new PreloadGenerator();
const preloadResult = preloadGenerator.generate([samplePackage]);

console.log('=== Preload Script ===');
console.log(preloadResult);
console.log('Contains electronAPI:', preloadResult.includes('electronAPI'));
console.log('Contains createUser:', preloadResult.includes('createUser'));
console.log('Does not contain ctx:', !preloadResult.includes('ctx'));

// ハンドラーコード検証
const handlerGenerator = new HandlerGenerator();
const handlerResult = handlerGenerator.generate([samplePackage]);

console.log('=== Handler Code ===');
console.log(handlerResult);
console.log('Contains autoGenerateHandlers:', handlerResult.includes('autoGenerateHandlers'));
console.log('Contains error handling:', handlerResult.includes('success: true'));

// 型定義検証
const typeGenerator = new TypeDefinitionGenerator();
const typeResult = typeGenerator.generate([samplePackage]);

console.log('=== Type Definitions ===');
console.log(typeResult);
console.log('Contains interface ElectronAPI:', typeResult.includes('interface ElectronAPI'));
console.log('Contains Result type:', typeResult.includes('Promise<Result<User>>'));

// TypeScript構文チェック
try {
  ts.transpile(preloadResult);
  ts.transpile(handlerResult);
  ts.transpile(typeResult);
  console.log('✅ All generated code compiles successfully');
} catch (error) {
  console.error('❌ TypeScript compilation error:', error);
}
```

**完了基準**: すべての生成コードが正しく動作し、TypeScript構文チェックを通過する

## 3. 技術要件

### 3.1 使用ライブラリ
- **Handlebars**: テンプレートエンジン
- **Prettier**: コードフォーマット
- **TypeScript Compiler API**: 構文チェック

### 3.2 生成コードの品質基準
- **構文正確性**: TypeScriptコンパイラーでエラーなし
- **型安全性**: strict modeで問題なし
- **可読性**: 適切なコメントとフォーマット
- **保守性**: 一貫した構造とパターン
- **バリデーション**: ユーザー側のAPI実装内で実施（ハンドラーでは実施しない）

### 3.3 パフォーマンス要件
- **生成速度**: 100関数で3秒以内
- **メモリ使用量**: 150MB以内
- **コードサイズ**: 必要最小限の出力

## 4. 品質基準

### 4.1 コード品質
- 生成されるコードがESLintルールに準拠
- TypeScript strict mode対応
- 適切なエラーハンドリング
- 一貫したコードスタイル
- バリデーションロジックはユーザー側のAPIに委譲

### 4.2 検証品質
- **手動検証**: 生成コードの詳細確認
- **実動確認**: 実際のElectronアプリでの動作確認
- **エラーケース**: 異常系パターンの確認

### 4.3 生成コード品質
- **型安全性**: 100%保証
- **実行時エラー**: ゼロ
- **パフォーマンス**: オーバーヘッドなし

## 5. リスク管理

### 5.1 技術的リスク

**リスク**: テンプレートの複雑化
- **対策**: シンプルなテンプレート設計、段階的拡張
- **検出**: 定期的なテンプレート品質チェック

**リスク**: 生成コードの品質問題
- **対策**: 厳密なテストケース、実プロジェクトでの検証
- **検出**: 継続的な品質測定

**リスク**: エラーハンドリングの複雑性
- **対策**: 標準パターンの確立、カスタマイズ可能な設計
- **検出**: エラーケースの網羅的テスト

## 6. 完了基準

### 6.1 必須基準
- [ ] プリロード、ハンドラー、型定義の3種類すべてが生成可能
- [ ] 生成されるコードがTypeScript strict modeで問題なし
- [ ] カスタムエラーハンドラーに対応
- [ ] 手動検証による品質確認
- [ ] 実際のElectronアプリでの動作確認

### 6.2 推奨基準
- [ ] コードの可読性と保守性が高い
- [ ] パフォーマンス要件をクリア
- [ ] 詳細なログ出力機能
- [ ] 生成コードの検証機能

## 7. 次フェーズへの引き継ぎ

### 7.1 Phase 4への準備
- 生成されたコードの統合方法の確認
- ビルドプロセスでの生成コード管理方法の検討
- 設定ファイルとの連携確認

### 7.2 成果物の確認
- **format.ts**: 完全に動作するコード生成エンジン
- **templates/**: すべてのテンプレート
- **生成コード検証システム**: 品質保証機能
- **検証レポート**: 生成コードの品質確認結果

### 7.3 移行判定基準
- すべての完了基準をクリア
- 実際のElectronプロジェクトでの動作実績
- Phase 4での統合準備完了
