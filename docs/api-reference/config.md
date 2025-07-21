# 設定API リファレンス

electron-flowの設定ファイル (`electron-flow.config.ts`) で使用できるすべてのオプションの詳細仕様を説明します。

## AutoCodeOption インターフェース

### 概要

```typescript
interface AutoCodeOption {
  // 必須プロパティ
  targetPath: string;
  preloadPath: string;
  registerPath: string;
  rendererPath: string;
  
  // オプションプロパティ
  ignores?: string[];
  contextPath?: string;
  errorHandler?: ErrorHandlerConfig;
  advanced?: AdvancedOptions;
}
```

## 必須プロパティ

### `targetPath`

- **型**: `string`
- **説明**: APIファイルが配置されているディレクトリのパス
- **例**: `"./src/main/api"`

```typescript
export const autoCodeOption: AutoCodeOption = {
  targetPath: "./src/main/api",
  // ...
};
```

**注意事項**:
- 相対パスまたは絶対パスを指定
- 指定されたディレクトリ内のすべての `.ts` ファイルが解析対象
- サブディレクトリも再帰的に探索される

### `preloadPath`

- **型**: `string`
- **説明**: プリロードスクリプトの生成先パス
- **例**: `"./src/preload/autogenerate/index.ts"`

```typescript
export const autoCodeOption: AutoCodeOption = {
  preloadPath: "./src/preload/autogenerate/index.ts",
  // ...
};
```

**生成されるファイルの内容**:
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  createUser: (request) => ipcRenderer.invoke('api:createUser', request),
  getUsers: () => ipcRenderer.invoke('api:getUsers'),
  // ... その他のAPI関数
});
```

### `registerPath`

- **型**: `string`
- **説明**: IPCハンドラーの生成先パス
- **例**: `"./src/main/register/autogenerate/index.ts"`

```typescript
export const autoCodeOption: AutoCodeOption = {
  registerPath: "./src/main/register/autogenerate/index.ts",
  // ...
};
```

**生成されるファイルの内容**:
```typescript
import { createUserSchema } from '../../api/users';
import * as usersAPI from '../../api/users';

export const autoGenerateHandlers = {
  'api:createUser': (ctx) => async (request) => {
    try {
      const validatedRequest = createUserSchema.parse(request);
      const result = await usersAPI.createUser(ctx, validatedRequest);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: { message: error.message, type: 'ERROR' } };
    }
  },
  // ... その他のハンドラー
};
```

### `rendererPath`

- **型**: `string`
- **説明**: レンダラープロセス用の型定義ファイルの生成先パス
- **例**: `"./src/renderer/autogenerate/index.d.ts"`

```typescript
export const autoCodeOption: AutoCodeOption = {
  rendererPath: "./src/renderer/autogenerate/index.d.ts",
  // ...
};
```

**生成されるファイルの内容**:
```typescript
import { CreateUserRequest, User } from '../types';

declare global {
  interface Window {
    electronAPI: {
      createUser: (request: CreateUserRequest) => Promise<APIResponse<User>>;
      getUsers: () => Promise<APIResponse<User[]>>;
      // ... その他のAPI関数
    };
  }
}

type APIResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { message: string; type: string; details?: any } };
```

## オプションプロパティ

### `ignores`

- **型**: `string[]`
- **デフォルト**: `[]`
- **説明**: 除外する関数名のパターン（glob形式）

```typescript
export const autoCodeOption: AutoCodeOption = {
  ignores: [
    "internal*",        // "internal" で始まる関数を除外
    "_*",              // "_" で始まる関数を除外（プライベート関数）
    "*Test",           // "Test" で終わる関数を除外
    "*Helper",         // "Helper" で終わる関数を除外
    "validateSchema",  // 特定の関数名を除外
    "debug*"           // "debug" で始まる関数を除外
  ],
  // ...
};
```

**パターンの例**:
- `"functionName"` - 完全一致
- `"prefix*"` - 前方一致
- `"*suffix"` - 後方一致
- `"*contains*"` - 部分一致

### `contextPath`

- **型**: `string | undefined`
- **デフォルト**: `"./src/types/context.ts"`
- **説明**: Context型定義ファイルのパス

```typescript
export const autoCodeOption: AutoCodeOption = {
  contextPath: "./src/shared/types/context.ts",
  // ...
};
```

**Context型定義ファイルの例**:
```typescript
import { IpcMainInvokeEvent } from 'electron';

export interface Context {
  event: IpcMainInvokeEvent;
  user?: AuthenticatedUser;
  db: DatabaseConnection;
  logger: Logger;
}
```

### `errorHandler`

- **型**: `ErrorHandlerConfig | undefined`
- **説明**: カスタムエラーハンドラーの設定

```typescript
interface ErrorHandlerConfig {
  handlerPath: string;      // エラーハンドラー関数のパス
  handlerName: string;      // エクスポートされた関数名
  defaultHandler?: boolean; // デフォルトハンドラーも併用するか
}
```

#### 設定例

```typescript
export const autoCodeOption: AutoCodeOption = {
  errorHandler: {
    handlerPath: "../../errors/customHandler",
    handlerName: "handleAPIError",
    defaultHandler: true
  },
  // ...
};
```

#### カスタムエラーハンドラーの実装

```typescript
// src/errors/customHandler.ts
import { Context } from '../types/context';

export function handleAPIError(error: any, context: Context) {
  // ログ記録
  context.logger.error('API Error', error, {
    userId: context.user?.id,
    sessionId: context.session?.id
  });
  
  // エラーの種類による処理
  if (error instanceof ZodError) {
    return {
      success: false,
      error: {
        message: 'バリデーションエラーが発生しました',
        type: 'VALIDATION_ERROR',
        details: error.errors
      }
    };
  }
  
  // デフォルトエラー
  return {
    success: false,
    error: {
      message: 'システムエラーが発生しました',
      type: 'SYSTEM_ERROR'
    }
  };
}
```

#### `defaultHandler` オプション

- `true`: カスタムハンドラーがエラーを処理できない場合、デフォルトハンドラーにフォールバック
- `false`: カスタムハンドラーのみを使用

### `advanced`

- **型**: `AdvancedOptions | undefined`
- **説明**: 高度な設定オプション

```typescript
interface AdvancedOptions {
  // パフォーマンス設定
  concurrency?: number;
  cache?: boolean;
  
  // 生成オプション
  generateSourceMap?: boolean;
  minify?: boolean;
  
  // デバッグ設定
  debug?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  
  // ファイル監視設定
  watchOptions?: WatchOptions;
  
  // TypeScript設定
  tsConfig?: string;
}

interface WatchOptions {
  debounceMs?: number;
  ignoreInitial?: boolean;
  followSymlinks?: boolean;
  ignored?: string | string[];
}
```

#### 詳細設定例

```typescript
export const autoCodeOption: AutoCodeOption = {
  // ... 基本設定
  
  advanced: {
    // パフォーマンス設定
    concurrency: 8,              // 並列処理数（デフォルト: 4）
    cache: true,                 // キャッシュ有効化（デフォルト: true）
    
    // 生成オプション
    generateSourceMap: true,     // ソースマップ生成（デフォルト: false）
    minify: false,              // コード圧縮（デフォルト: false）
    
    // デバッグ設定
    debug: process.env.NODE_ENV === 'development',
    logLevel: 'info',           // ログレベル（デフォルト: 'info'）
    
    // ファイル監視設定
    watchOptions: {
      debounceMs: 500,          // デバウンス時間（デフォルト: 300）
      ignoreInitial: false,     // 初期スキャンをスキップ（デフォルト: false）
      followSymlinks: true,     // シンボリックリンクを追跡（デフォルト: true）
      ignored: [               // 無視するパターン
        '**/node_modules/**',
        '**/*.spec.ts',
        '**/*.test.ts'
      ]
    },
    
    // TypeScript設定
    tsConfig: './tsconfig.build.json'  // カスタムtsconfig（デフォルト: './tsconfig.json'）
  }
};
```

## 設定例集

### 基本的な設定

```typescript
import { AutoCodeOption } from 'electron-flow';

export const autoCodeOption: AutoCodeOption = {
  targetPath: "./src/main/api",
  preloadPath: "./src/preload/autogenerate/index.ts",
  registerPath: "./src/main/register/autogenerate/index.ts",
  rendererPath: "./src/renderer/autogenerate/index.d.ts"
};
```

### 高度な設定

```typescript
import { AutoCodeOption } from 'electron-flow';

export const autoCodeOption: AutoCodeOption = {
  // 基本パス設定
  targetPath: "./src/main/api",
  preloadPath: "./src/preload/autogenerate/index.ts",
  registerPath: "./src/main/register/autogenerate/index.ts",
  rendererPath: "./src/renderer/autogenerate/index.d.ts",
  
  // 除外設定
  ignores: [
    "internal*",
    "_*",
    "*Test",
    "*Helper"
  ],
  
  // カスタムパス
  contextPath: "./src/shared/types/context.ts",
  
  // エラーハンドリング
  errorHandler: {
    handlerPath: "../../errors/customHandler",
    handlerName: "handleAPIError",
    defaultHandler: true
  },
  
  // 高度な設定
  advanced: {
    concurrency: 8,
    cache: true,
    generateSourceMap: true,
    debug: process.env.NODE_ENV === 'development',
    logLevel: 'info',
    watchOptions: {
      debounceMs: 500,
      ignored: ['**/*.spec.ts', '**/*.test.ts']
    }
  }
};
```

### 環境別設定

```typescript
import { AutoCodeOption } from 'electron-flow';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const autoCodeOption: AutoCodeOption = {
  targetPath: "./src/main/api",
  preloadPath: "./src/preload/autogenerate/index.ts",
  registerPath: "./src/main/register/autogenerate/index.ts",
  rendererPath: "./src/renderer/autogenerate/index.d.ts",
  
  // 開発環境では内部関数も含める
  ignores: isDevelopment ? [] : ["internal*", "_*", "*Test"],
  
  errorHandler: {
    handlerPath: "../../errors/handler",
    handlerName: isDevelopment ? "developmentHandler" : "productionHandler",
    defaultHandler: isDevelopment
  },
  
  advanced: {
    debug: isDevelopment,
    logLevel: isDevelopment ? 'debug' : 'warn',
    generateSourceMap: isDevelopment,
    minify: isProduction,
    cache: true,
    concurrency: isProduction ? 8 : 4
  }
};
```

### モノレポ対応設定

```typescript
import { AutoCodeOption } from 'electron-flow';

export const autoCodeOption: AutoCodeOption = {
  // パッケージ内のパス
  targetPath: "./packages/main/src/api",
  preloadPath: "./packages/preload/src/autogenerate/index.ts",
  registerPath: "./packages/main/src/register/autogenerate/index.ts",
  rendererPath: "./packages/renderer/src/autogenerate/index.d.ts",
  
  // 共有型定義
  contextPath: "./packages/shared/src/types/context.ts",
  
  advanced: {
    // ワークスペースのtsconfig
    tsConfig: "./packages/main/tsconfig.json",
    
    watchOptions: {
      // モノレポの無視パターン
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        'packages/*/node_modules/**'
      ]
    }
  }
};
```

## 設定の検証

### 実行時検証

electron-flowは起動時に設定の妥当性を検証します：

```typescript
// 必須プロパティの存在確認
if (!config.targetPath) {
  throw new ConfigError('targetPath is required');
}

// パスの存在確認
if (!fs.existsSync(config.targetPath)) {
  throw new ConfigError(`Target directory not found: ${config.targetPath}`);
}

// ignoresパターンの検証
config.ignores?.forEach(pattern => {
  if (typeof pattern !== 'string') {
    throw new ConfigError(`Invalid ignore pattern: ${pattern}`);
  }
});
```

### TypeScript型チェック

設定ファイルはTypeScriptで記述されるため、コンパイル時に型チェックが行われます：

```bash
# 設定ファイルの型チェック
npx tsc --noEmit electron-flow.config.ts
```

## 設定の継承

### 基本設定の拡張

```typescript
// base.config.ts
export const baseConfig: Partial<AutoCodeOption> = {
  ignores: ["internal*", "_*"],
  advanced: {
    cache: true,
    logLevel: 'info'
  }
};

// electron-flow.config.ts
import { baseConfig } from './base.config';

export const autoCodeOption: AutoCodeOption = {
  ...baseConfig,
  targetPath: "./src/main/api",
  preloadPath: "./src/preload/autogenerate/index.ts",
  registerPath: "./src/main/register/autogenerate/index.ts",
  rendererPath: "./src/renderer/autogenerate/index.d.ts",
  
  // 基本設定を上書き
  advanced: {
    ...baseConfig.advanced,
    debug: true
  }
};
```

これらの設定オプションを適切に使用することで、プロジェクトの要件に合わせたelectron-flowの動作をカスタマイズできます。