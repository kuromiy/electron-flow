# 設定ガイド

electron-flowの詳細な設定方法と基本概念について説明します。

## 基本概念

### TypeScript API の定義方法

electron-flowは、特定の形式に従ったTypeScript関数を解析し、IPC通信コードを自動生成します。

#### 基本的なAPI関数の形式

```typescript
export async function functionName(
  ctx: Context,
  parameter: ParameterType
): Promise<ReturnType> {
  // 実装
}
```

**重要な要件**:
1. 関数は `export` される必要があります
2. 第一引数は必ず `Context` 型である必要があります
3. 戻り値は `Promise` 型である必要があります

#### パラメータのパターン

```typescript
// パラメータなし
export async function getUsers(ctx: Context): Promise<User[]>

// 単一パラメータ
export async function getUser(ctx: Context, id: string): Promise<User>

// 複数パラメータ
export async function updateUser(
  ctx: Context, 
  id: string, 
  updates: Partial<User>
): Promise<User>

// オブジェクトパラメータ（推奨）
export async function createUser(
  ctx: Context,
  request: CreateUserRequest
): Promise<User>
```

### Zodスキーマの使用

入力検証のためにZodスキーマを定義し、対応する型を生成します。

```typescript
import { z } from 'zod';

// Zodスキーマの定義
export const createUserSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100, "名前は100文字以内です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  age: z.number().min(0).max(120).optional(),
  role: z.enum(['admin', 'user', 'guest']).default('user')
});

// 型の生成
export type CreateUserRequest = z.infer<typeof createUserSchema>;

// API関数での使用
export async function createUser(
  ctx: Context,
  request: CreateUserRequest
): Promise<User> {
  // Zodスキーマによる自動バリデーションが適用される
  // ...
}
```

### 生成されるコードの理解

electron-flowは3つのファイルを生成します：

#### 1. プリロードスクリプト (`src/preload/autogenerate/index.ts`)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  createUser: (request: CreateUserRequest) => 
    ipcRenderer.invoke('api:createUser', request),
  getUsers: () => 
    ipcRenderer.invoke('api:getUsers'),
  // ... その他のAPI関数
});
```

#### 2. IPCハンドラー (`src/main/register/autogenerate/index.ts`)

```typescript
import { createUserSchema } from '../../api/users';
import * as usersAPI from '../../api/users';

export const autoGenerateHandlers = {
  'api:createUser': (ctx) => async (request) => {
    try {
      // Zodバリデーション
      const validatedRequest = createUserSchema.parse(request);
      const result = await usersAPI.createUser(ctx, validatedRequest);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          message: error.message, 
          type: 'VALIDATION_ERROR' 
        } 
      };
    }
  },
  // ... その他のハンドラー
};
```

#### 3. 型定義 (`src/renderer/autogenerate/index.d.ts`)

```typescript
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

## 設定ファイル (electron-flow.config.ts)

### 基本設定

```typescript
import { AutoCodeOption } from 'electron-flow';

export const autoCodeOption: AutoCodeOption = {
  // 必須設定
  targetPath: "./src/main/api",           // APIファイルが配置されているディレクトリ
  preloadPath: "./src/preload/autogenerate/index.ts",    // プリロード生成先
  registerPath: "./src/main/register/autogenerate/index.ts", // ハンドラー生成先
  rendererPath: "./src/renderer/autogenerate/index.d.ts",    // 型定義生成先
  
  // オプション設定
  ignores: [],                           // 除外する関数名のパターン
  contextPath: "./src/types/context.ts", // Context型定義ファイル
};
```

### 高度な設定

```typescript
export const autoCodeOption: AutoCodeOption = {
  // 基本設定
  targetPath: "./src/main/api",
  preloadPath: "./src/preload/autogenerate/index.ts",
  registerPath: "./src/main/register/autogenerate/index.ts",
  rendererPath: "./src/renderer/autogenerate/index.d.ts",
  
  // 除外設定
  ignores: [
    "internal*",        // internal で始まる関数を除外
    "_*",              // _ で始まる関数を除外
    "*Test",           // Test で終わる関数を除外
    "validateSchema"   // 特定の関数を除外
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
    concurrency: 8,              // 並列処理数
    cache: true,                 // キャッシュ有効化
    generateSourceMap: true,     // ソースマップ生成
    debug: process.env.NODE_ENV === 'development',
    logLevel: 'info'
  }
};
```

設定オプションの詳細については、[設定API リファレンス](../api-reference/config.md)を参照してください。

## Context型のカスタマイズ

### 基本的なContext

```typescript
// src/types/context.ts
import { IpcMainInvokeEvent } from 'electron';

export interface Context {
  event: IpcMainInvokeEvent;
}
```

### 拡張されたContext

```typescript
// src/types/context.ts
import { IpcMainInvokeEvent } from 'electron';

export interface Context {
  event: IpcMainInvokeEvent;
  
  // 認証情報
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user' | 'guest';
    permissions: string[];
  };
  
  // データベース接続
  db: {
    users: UserRepository;
    posts: PostRepository;
    // ... その他のリポジトリ
  };
  
  // ロガー
  logger: {
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, error?: Error, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
  };
  
  // 設定
  config: {
    uploadPath: string;
    maxFileSize: number;
    allowedExtensions: string[];
  };
  
  // セッション管理
  session: {
    id: string;
    startedAt: Date;
    lastActivity: Date;
  };
}
```

### メインプロセスでのContext作成

```typescript
// src/main/main.ts
import { IpcMainInvokeEvent } from 'electron';
import { Context } from '../types/context';
import { createLogger } from './utils/logger';
import { getDatabaseConnection } from './database';
import { getAppConfig } from './config';

function createContext(event: IpcMainInvokeEvent): Context {
  return {
    event,
    
    // データベース接続の提供
    db: getDatabaseConnection(),
    
    // ロガーの提供
    logger: createLogger({
      level: 'info',
      sessionId: getSessionId(event)
    }),
    
    // 設定の提供
    config: getAppConfig(),
    
    // セッション情報
    session: getSessionInfo(event),
    
    // 認証情報（オプション）
    user: getCurrentUser(event)
  };
}
```

## カスタムエラーハンドリング

### エラーハンドラーの実装

```typescript
// src/errors/customHandler.ts
export function handleAPIError(error: any, context: Context) {
  // ログ記録
  context.logger.error('API Error', error, {
    userId: context.user?.id,
    sessionId: context.session.id
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
  
  if (error instanceof UnauthorizedError) {
    return {
      success: false,
      error: {
        message: '認証が必要です',
        type: 'UNAUTHORIZED'
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

### 設定での使用

```typescript
// electron-flow.config.ts
export const autoCodeOption: AutoCodeOption = {
  // ...基本設定
  
  errorHandler: {
    handlerPath: "../../errors/customHandler",
    handlerName: "handleAPIError",
    defaultHandler: false  // デフォルトハンドラーを無効化
  }
};
```

## ディレクトリ構造の例

```
src/
├── main/
│   ├── api/                    # API定義
│   │   ├── users.ts
│   │   ├── posts.ts
│   │   └── files.ts
│   ├── register/
│   │   └── autogenerate/       # 生成されるIPCハンドラー
│   │       └── index.ts
│   └── main.ts
├── preload/
│   └── autogenerate/           # 生成されるプリロードスクリプト
│       └── index.ts
├── renderer/
│   ├── autogenerate/           # 生成される型定義
│   │   └── index.d.ts
│   └── components/
└── types/
    └── context.ts              # Context型定義
```

## 次のステップ

- [ベストプラクティス](./best-practices.md) - 効果的な使用方法
- [CLI API リファレンス](../api-reference/cli.md) - コマンドライン仕様
- [設定API リファレンス](../api-reference/config.md) - 設定オプション詳細