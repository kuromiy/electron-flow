# API リファレンス

electron-flowの詳細な技術仕様、設定オプション、関数・メソッドの完全リファレンス

> 初めてお使いの方は[README](./README.md)のクイックスタートから開始してください。

## 型定義

### 自動コード生成設定

```typescript
type AutoCodeOption = {
    targetPath: string;           // APIディレクトリのパス
    ignores: string[];            // 除外する関数名のリスト
    preloadPath: string;          // プリロード生成先パス
    registerPath: string;         // レジスタ生成先パス
    rendererPath: string;         // レンダラー型定義生成先パス
    contextPath?: string;         // Context型定義ファイルのパス（デフォルト: "./src/types/context.ts"）
    errorHandler?: {              // カスタムエラーハンドリング設定
        handlerPath: string;      // エラーハンドラー関数のインポートパス（相対パス）
                                 // 例: "../../errors/handler"
        handlerName: string;      // エクスポートされたエラーハンドラー関数名
                                 // 例: "customErrorHandler"
        defaultHandler?: boolean; // デフォルトハンドラーも併用するか（デフォルト: false）
                                 // true: カスタムハンドラーでエラーが発生した場合、
                                 //       デフォルトハンドラーにフォールバック
    };
}
```

### Context型定義

```typescript
// initコマンドで生成されるcontext.tsのテンプレート
import { IpcMainInvokeEvent } from 'electron';

export interface Context {
    event: IpcMainInvokeEvent;
    // ユーザー定義のプロパティをここに追加
    // 例:
    // db: DatabaseConnection;
    // user?: AuthenticatedUser;
}
```

### エラーハンドリング

```typescript
type ErrorHandler = (
    error: Error,
    ctx: Context
) => {
    success: false;
    error: {
        message: string;
        type: string;
        details?: any;
    };
};

type Result<T> = 
    | { success: true; data: T }
    | { success: false; error: ErrorDetails };
```

## 設定エクスポート

```typescript
export const autoCodeOption: AutoCodeOption
```

## CLIコマンド

```bash
# プロジェクト初期化 - 設定ファイルとContext型定義を生成
npx electron-flow init

# コード生成 - 設定に基づいてIPC通信コードを生成
npx electron-flow gen
```

### initコマンド

`init`コマンドは以下のファイルを生成します：

1. **electron-flow.config.ts** - 設定ファイル
2. **Context型定義ファイル** - デフォルトは`src/types/context.ts`（`contextPath`設定でカスタマイズ可能）

生成されるcontext.tsのテンプレート：
```typescript
import { IpcMainInvokeEvent } from 'electron';

export interface Context {
    event: IpcMainInvokeEvent;
    // ユーザー定義のプロパティをここに追加してください
    // 例:
    // db: DatabaseConnection;
    // user?: AuthenticatedUser;
}
```

## 主要モジュール

### packages/codeGenerate

TypeScript APIからElectron IPC通信コードを自動生成

```typescript
// 一回限りのビルド
async function build(option: AutoCodeOption): Promise<{
    zodObjectInfos: ZodObjectInfo[];
    packages: PackageInfo[];
}>

// ファイル監視付きビルド
async function watchBuild(option: AutoCodeOption): Promise<void>
```

**生成されるファイル:**
- プリロードスクリプト（レンダラー→メインIPC通信）
- レジスター（メインプロセスのIPC通信ハンドラー）
- 型定義（レンダラー用TypeScript定義）


## 設定例

### 基本的な設定

```typescript
// electron-flow.config.ts
export const autoCodeOption: AutoCodeOption = {
    targetPath: "./src/main/api",
    ignores: ["internal.privateFunction"],
    preloadPath: "./src/preload/autogenerate/index.ts",
    registerPath: "./src/main/register/autogenerate/index.ts",
    rendererPath: "./src/renderer/autogenerate/index.d.ts"
};
```

### Context型定義のカスタムパスを使用する設定

```typescript
// electron-flow.config.ts
export const autoCodeOption: AutoCodeOption = {
    targetPath: "./src/main/api",
    ignores: [],
    preloadPath: "./src/preload/autogenerate/index.ts",
    registerPath: "./src/main/register/autogenerate/index.ts",
    rendererPath: "./src/renderer/autogenerate/index.d.ts",
    contextPath: "./src/shared/types/context.ts"  // カスタムパスの指定
};
```

### API定義例

```typescript
// src/main/api/users.ts
import { z } from 'zod';

export const createUserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email()
});
export type CreateUserRequest = z.infer<typeof createUserSchema>;

export async function createUser(ctx: Context, request: CreateUserRequest) {
    const user = await ctx.db.users.create({ data: request });
    return user;
}

export async function getUsers(ctx: Context) {
    return await ctx.db.users.findMany();
}
```

## エラーハンドリング

electron-flowは、Electron IPCの非同期通信で発生するエラーを一元的に管理するための堅牢なエラーハンドリング機能を提供します。

### エラー処理の流れ

1. API関数でエラーが発生
2. 自動生成されたハンドラーがエラーをキャッチ
3. カスタムエラーハンドラー（設定されている場合）またはデフォルトハンドラーが実行
4. Result型でラップされたエラーレスポンスがレンダラーに返される

### 基本的なエラー処理

自動生成されるコードはResult型を使用したエラーハンドリングを提供します：

```typescript
// 自動生成されるハンドラー構造
export const autoGenerateHandlers = {
    "apiFunction": (baseCtx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            const ctx: Context = { ...baseCtx, event };
            try {
                const result = await apiFunction(ctx, args);
                return { success: true, data: result };
            } catch (error) {
                // カスタムエラーハンドラーが設定されている場合
                if (customErrorHandler) {
                    return customErrorHandler(error, ctx);
                }
                // デフォルトのエラーハンドリング
                return { 
                    success: false, 
                    error: {
                        message: error.message || 'Unknown error',
                        type: error.constructor.name,
                        details: null
                    }
                };
            }
        };
    }
};
```

### カスタムエラーハンドラー

```typescript
// electron-flow.config.ts - カスタムエラーハンドラー設定
export const autoCodeOption: AutoCodeOption = {
    // ... その他の設定
    errorHandler: {
        handlerPath: "../../errors/handler",
        handlerName: "customErrorHandler",
        defaultHandler: true
    }
};

// src/errors/handler.ts - カスタムエラーハンドラー実装
export function customErrorHandler(error: Error, ctx: Context) {
    // ログ記録
    console.error(`API Error:`, error);
    
    // エラータイプに応じた処理
    if (error.name === 'ValidationError') {
        return {
            success: false,
            error: {
                message: '入力内容を確認してください',
                type: 'ValidationError',
                details: null
            }
        };
    }
    
    // デフォルト処理
    return {
        success: false,
        error: {
            message: 'エラーが発生しました',
            type: error.constructor.name,
            details: process.env.NODE_ENV === 'development' ? error.stack : null
        }
    };
}
```

### レンダラー側での使用

```typescript
// src/renderer/hooks/useAPI.ts
export function useAPI() {
    const createUser = async (name: string, email: string) => {
        const result = await window.electronAPI.createUser(name, email);
        
        if (result.success) {
            return result.data;
        } else {
            console.error('API Error:', result.error.message);
            return null;
        }
    };
    
    return { createUser };
}
```

## 制約事項

- **targetPath設定**: 存在しないパスを指定するとエラーが発生
- **ファイル監視**: 大量のファイル変更時にロック機構により処理が制限

## 依存関係

- Node.js 22+, TypeScript 5+
- Zod

## パフォーマンス

- ファイル監視時の同時ビルドは制限される
- 大量のAPIファイルがある場合、初回ビルド時間が長くなる可能性

---

詳細な設計思想については[アーキテクチャガイド](./ARCHITECTURE.md)を参照してください。