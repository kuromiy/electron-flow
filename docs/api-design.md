# API設計書

## 1. ユーザーが定義するハンドラー

### 基本パターン（リクエストあり）
```typescript
// ユーザーのプロジェクト: src/main/handlers/author.ts
import { z } from 'zod';
import type { Context } from '../context';

// リクエストスキーマ（Zodで定義）
export const getAuthorSchema = z.object({
    id: z.string(),
});
export type GetAuthorRequest = z.infer<typeof getAuthorSchema>;

// ハンドラー関数（ユーザーがバリデーションを実装）
export async function getAuthor(
    // データベースやロガーなどを所持
    // 詳細はelectron-flowを使っている側で
    ctx: Context,
    // リクエストがない場合省略可
    request: GetAuthorRequest,
) {
    // バリデート（ユーザーが実装）
    const valid = getAuthorSchema.safeParse(request);
    if (!valid.success) {
        ctx.logger.warn("get author valid error", valid.error);
        throw new ValidError(valid.error);
    }

    // 処理
    const author = await ctx.db.author.findUnique({
        where: { id: valid.data.id }
    });
    if (!author) {
        throw new ApplicationError('Author not found');
    }
    return author; // 型は推論される
}
```

### リクエストパラメータなしのパターン
```typescript
// src/main/handlers/user.ts
export async function getCurrentUser(ctx: Context) {
    if (!ctx.user) {
        throw new ApplicationError('Not authenticated');
    }
    return ctx.user;
}

// 同期関数の例
export function getSystemInfo(ctx: Context) {
    return {
        version: ctx.app.getVersion(),
        platform: process.platform,
        nodeVersion: process.version,
    };
}
```

## 2. ユーザーが定義するエラーハンドラー（Contextを受け取る）

```typescript
// src/main/error-handler.ts
import { failure } from 'electron-flow/runtime';
import type { ErrorValue } from 'electron-flow/runtime';
import type { Context } from './context';
import { z } from 'zod';

// ユーザー独自のエラー型
export class ValidError extends Error {
    constructor(public zodError: z.ZodError) {
        super('Validation failed');
        this.name = 'ValidError';
    }
}

export class ApplicationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApplicationError';
    }
}

// エラー変換ユーティリティ
function zodErrorToErrorValue(zodError: z.ZodError): ErrorValue[] {
    return zodError.errors.map(err => ({
        path: err.path.join('.'),
        messages: [err.message]
    }));
}

// ユーザー定義のエラーハンドラー（Contextを受け取る）
// この関数がelectron-flowによって生成されたコードから呼び出される
export function handleError(ctx: Context, e: unknown) {
    // Contextを使ったログ出力
    if (e instanceof ValidError) {
        ctx.logger.warn('Validation error', e.zodError);
        return failure(zodErrorToErrorValue(e.zodError));
    }
    if (e instanceof ApplicationError) {
        ctx.logger.error('Application error', e.message);
        return failure([{ path: "application", messages: [e.message] }]);
    }
    if (e instanceof z.ZodError) {
        ctx.logger.warn('Direct zod error', e);
        return failure(zodErrorToErrorValue(e));
    }
    // 予期しないエラー
    ctx.logger.error('System error', e);
    return failure([{ path: "system", messages: [e instanceof Error ? e.message : 'Unknown error'] }]);
}
```

## 3. Context型の定義

```typescript
// src/main/context.ts
import { IpcMainInvokeEvent } from 'electron';
import type { PrismaClient } from '@prisma/client';

export interface Context {
    // electron-flowが自動的に注入
    event: IpcMainInvokeEvent;
    
    // ユーザー定義のプロパティ
    db: PrismaClient;
    logger: Logger;
    config: AppConfig;
    user?: AuthenticatedUser;
    
    // その他のサービス
    auth: AuthService;
    storage: StorageService;
}
```

## 4. 生成されるコード

### メインプロセス側（src/generated/main/ipc-handlers.ts）
```typescript
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { success } from 'electron-flow/runtime';
import type { Context } from '../../main/context';

// ハンドラーのインポート（自動検出）
import { getAuthor } from '../../main/handlers/author';
import { getCurrentUser, getSystemInfo } from '../../main/handlers/user';

// ユーザー定義のエラーハンドラーをインポート
import { handleError } from '../../main/error-handler';

// 生成されたハンドラー登録関数
export function registerIPCHandlers(ctx: Omit<Context, 'event'>) {
    // getAuthor（引数をそのまま渡す、バリデーションはハンドラー内で実行）
    ipcMain.handle('getAuthor', async (event: IpcMainInvokeEvent, args: any) => {
        try {
            const result = await getAuthor({ ...ctx, event }, args);
            return success(result);
        } catch (e) {
            return handleError({ ...ctx, event }, e);
        }
    });

    // getCurrentUser（リクエストなし、非同期）
    ipcMain.handle('getCurrentUser', async (event: IpcMainInvokeEvent) => {
        try {
            const result = await getCurrentUser({ ...ctx, event });
            return success(result);
        } catch (e) {
            return handleError({ ...ctx, event }, e);
        }
    });

    // getSystemInfo（リクエストなし、同期）
    ipcMain.handle('getSystemInfo', (event: IpcMainInvokeEvent) => {
        try {
            const result = getSystemInfo({ ...ctx, event });
            return success(result);
        } catch (e) {
            return handleError({ ...ctx, event }, e);
        }
    });
}
```

### プリロード側（src/generated/preload/api.ts）
```typescript
import { contextBridge, ipcRenderer } from 'electron';
import type { Result } from 'electron-flow/runtime';

// APIオブジェクト
const electronAPI = {
    getAuthor: (request: any): Promise<Result<any>> => {
        return ipcRenderer.invoke('getAuthor', request);
    },
    getCurrentUser: (): Promise<Result<any>> => {
        return ipcRenderer.invoke('getCurrentUser');
    },
    getSystemInfo: (): Promise<Result<any>> => {
        return ipcRenderer.invoke('getSystemInfo');
    },
};

// contextBridgeで公開
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

### レンダラー側（src/generated/renderer/api.ts）
```typescript
import { isSuccess, type Result } from 'electron-flow/runtime';
import type { GetAuthorRequest } from '../../main/handlers/author';

// 推論された戻り値の型（生成時にts-morphで解析）
type GetAuthorResponse = {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
};

type GetCurrentUserResponse = {
    id: string;
    name: string;
    email: string;
    role: string;
};

type GetSystemInfoResponse = {
    version: string;
    platform: NodeJS.Platform;
    nodeVersion: string;
};

// エラーハンドリングヘルパー
function unwrapResult<T>(result: Result<T>): T {
    if (isSuccess(result)) {
        return result.value;
    }
    const errorMessage = result.value
        .map(e => `${e.path}: ${e.messages.join(', ')}`)
        .join('; ');
    throw new Error(errorMessage);
}

// APIクライアント
export const api = {
    author: {
        get: async (request: GetAuthorRequest): Promise<GetAuthorResponse> => {
            const result = await window.electronAPI.getAuthor(request);
            return unwrapResult(result);
        },
    },
    user: {
        getCurrent: async (): Promise<GetCurrentUserResponse> => {
            const result = await window.electronAPI.getCurrentUser();
            return unwrapResult(result);
        },
    },
    system: {
        getInfo: async (): Promise<GetSystemInfoResponse> => {
            const result = await window.electronAPI.getSystemInfo();
            return unwrapResult(result);
        },
    },
};

// Window型拡張
declare global {
    interface Window {
        electronAPI: {
            getAuthor: (request: any) => Promise<Result<any>>;
            getCurrentUser: () => Promise<Result<any>>;
            getSystemInfo: () => Promise<Result<any>>;
        };
    }
}
```

## 5. electron-flowランタイムの型定義（electron-flowが提供）

```typescript
// electron-flow/runtime/error.ts
export interface ErrorValue {
    path: string;
    messages: string[];
}

// electron-flow/runtime/result.ts
export type Success<T> = {
    _tag: "success";
    value: T;
};

export type Failure = {
    _tag: "failure";
    value: ErrorValue[];
};

export type Result<T> = Success<T> | Failure;

export function success<T>(value: T): Success<T> {
    return { _tag: "success", value };
}

export function failure(value: ErrorValue[]): Failure {
    return { _tag: "failure", value };
}

export function isSuccess<T>(result: Result<T>): result is Success<T> {
    return result._tag === "success";
}

export function isFailure<T>(result: Result<T>): result is Failure {
    return result._tag === "failure";
}
```

## 6. CLIコマンド

### init - プロジェクト初期化
```bash
npx electron-flow init [options]
```

生成されるファイル構造:
```
.
├── electron-flow.config.ts
├── src/
│   ├── main/
│   │   ├── context.ts
│   │   ├── error-handler.ts    # Context付きエラーハンドラー
│   │   └── handlers/
│   │       └── example.ts
│   └── generated/
│       └── .gitkeep
```

### generate - コード生成
```bash
npx electron-flow generate [options]
```

オプション:
- `--config <path>`: 設定ファイルパス
- `--watch`: ファイル監視モード
- `--dry-run`: 実際にファイルを生成せずに確認

### dev - 開発サーバー
```bash
npx electron-flow dev [options]
```

機能:
- ハンドラーファイルの監視
- エラーハンドラーファイルの監視
- 変更時の自動コード生成
- Electronプロセスの自動リスタート
- Viteサーバーとの統合

## 7. 設定ファイル詳細

```typescript
// electron-flow.config.ts
import type { ElectronFlowConfig } from 'electron-flow';

const config: ElectronFlowConfig = {
    // ハンドラーファイルのディレクトリ（単一フォルダ）
    handlersDir: 'src/main/handlers',
    
    // 生成先ディレクトリ
    outDir: 'src/generated',
    
    // Context型の定義場所
    contextPath: 'src/main/context.ts',
    
    // エラーハンドラーの定義場所
    errorHandlerPath: 'src/main/error-handler.ts',
    
    // 開発サーバー設定
    dev: {
        // Electronのメインプロセスエントリー
        electronEntry: 'src/main/index.ts',
        
        // プリロードスクリプト
        preloadEntry: 'src/preload/index.ts',
        
        // Vite設定ファイル
        viteConfig: 'vite.config.ts',
        
        // 監視対象（生成トリガー）
        watchPaths: [
            'src/main/handlers/**/*.ts',
            'src/main/error-handler.ts',
            'electron-flow.config.ts',
        ],
    },
    
    // コード生成オプション
    generation: {
        // APIの名前空間化方法
        // 'file': ファイル名でグループ化 (author.ts → api.author.*)
        // 'flat': フラットな構造 (api.getAuthor)
        apiStructure: 'file',
        
        // 生成コードのフォーマット
        prettier: true,
        prettierConfig: '.prettierrc',
    },
};

export default config;
```

## 8. エラーハンドラーのカスタマイズ例

### 複雑なエラーハンドリング（Context活用）
```typescript
// src/main/error-handler.ts
import { failure } from 'electron-flow/runtime';
import type { ErrorValue } from 'electron-flow/runtime';
import type { Context } from './context';

// データベースエラー
export class DatabaseError extends Error {
    constructor(message: string, public code?: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

// 認証エラー
export class AuthenticationError extends Error {
    constructor(message: string = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

// 認可エラー
export class AuthorizationError extends Error {
    constructor(message: string = 'Insufficient permissions') {
        super(message);
        this.name = 'AuthorizationError';
    }
}

export function handleError(ctx: Context, e: unknown) {
    // Context情報をログに含める
    const logContext = {
        userId: ctx.user?.id,
        sessionId: ctx.event.sender.id,
        timestamp: new Date().toISOString(),
    };

    // バリデーションエラー
    if (e instanceof z.ZodError) {
        ctx.logger.warn('Validation error', { ...logContext, error: e });
        const errors = e.errors.map(err => ({
            path: err.path.join('.'),
            messages: [err.message]
        }));
        return failure(errors);
    }

    // 認証エラー
    if (e instanceof AuthenticationError) {
        ctx.logger.warn('Authentication error', { ...logContext, error: e.message });
        return failure([{ 
            path: "authentication", 
            messages: [e.message] 
        }]);
    }

    // 認可エラー
    if (e instanceof AuthorizationError) {
        ctx.logger.warn('Authorization error', { 
            ...logContext, 
            error: e.message,
            userRole: ctx.user?.role 
        });
        return failure([{ 
            path: "authorization", 
            messages: [e.message] 
        }]);
    }

    // データベースエラー
    if (e instanceof DatabaseError) {
        ctx.logger.error('Database error', { ...logContext, error: e, code: e.code });
        return failure([{ 
            path: "database", 
            messages: [`${e.message}${e.code ? ` (${e.code})` : ''}`] 
        }]);
    }

    // 一般的なアプリケーションエラー
    if (e instanceof ApplicationError) {
        ctx.logger.error('Application error', { ...logContext, error: e.message });
        return failure([{ 
            path: "application", 
            messages: [e.message] 
        }]);
    }

    // システムエラー
    ctx.logger.error('System error', { ...logContext, error: e });
    return failure([{ 
        path: "system", 
        messages: [e instanceof Error ? e.message : 'Unknown error'] 
    }]);
}
```

### セッション管理付きエラーハンドラー
```typescript
// src/main/error-handler.ts
import { failure } from 'electron-flow/runtime';
import type { ErrorValue } from 'electron-flow/runtime';
import type { Context } from './context';

export function handleError(ctx: Context, e: unknown) {
    // セッション情報の更新
    if (e instanceof AuthenticationError) {
        // セッションをクリア
        ctx.session.clear();
        ctx.logger.info('Session cleared due to authentication error', { 
            sessionId: ctx.event.sender.id 
        });
        return failure([{ 
            path: "authentication", 
            messages: [e.message] 
        }]);
    }

    // エラー統計の記録
    ctx.metrics.recordError(e.constructor.name, {
        userId: ctx.user?.id,
        endpoint: ctx.event.channel || 'unknown',
        timestamp: Date.now(),
    });

    // その他のエラー処理...
    return failure([{ 
        path: "system", 
        messages: [e instanceof Error ? e.message : 'Unknown error'] 
    }]);
}
```

## 9. 使用例

### レンダラー側での使用
```typescript
import { api } from './generated/renderer/api';

// 成功パターン
async function loadAuthor(id: string) {
    try {
        const author = await api.author.get({ id });
        console.log(`Author: ${author.name}`);
    } catch (error) {
        // handleErrorで定義されたエラーメッセージが表示される
        console.error('Failed to load author:', error.message);
    }
}

// エラー詳細の処理
async function handleLogin(email: string, password: string) {
    try {
        const result = await api.auth.login({ email, password });
        console.log('Login successful');
    } catch (error) {
        // エラーメッセージの例:
        // "email: Invalid email format; password: String must contain at least 8 character(s)"
        // "authentication: Invalid credentials"
        // "system: Database connection failed"
        
        if (error.message.includes('authentication:')) {
            // 認証エラーの場合
            showLoginError('Invalid email or password');
        } else if (error.message.includes('email:') || error.message.includes('password:')) {
            // バリデーションエラーの場合
            showValidationErrors(error.message);
        } else {
            // システムエラーの場合
            showSystemError('Something went wrong. Please try again later.');
        }
    }
}
```

## 10. 重要な設計変更

### Context付きエラーハンドリング
- **新機能**: `handleError(ctx: Context, e: unknown)` でContextを受け取る
- **利点**:
  - エラー処理でもロガー、データベース、セッション管理などのサービスにアクセス可能
  - より詳細なエラーログの出力が可能（ユーザーID、セッションIDなど）
  - エラーに応じたビジネスロジックの実行が可能（セッションクリア、統計記録など）
  - エラーごとに異なる処理戦略を実装可能

この設計により、ユーザーは自分のアプリケーションの要件に合わせて柔軟にエラーハンドリングを実装できます。特にContextの活用により、エラー処理においても本格的なアプリケーションロジックを実装することが可能になります。