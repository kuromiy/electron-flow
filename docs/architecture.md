# Electron Flow アーキテクチャ設計

## 概要
Electron Flowは、ElectronアプリケーションのIPC（Inter-Process Communication）通信コードを自動生成するnpmライブラリです。開発者が関数定義を書くだけで、型安全なIPC通信に必要なすべてのコードを生成します。

## 主要な特徴
- Result型パターンによるエラーハンドリング
- **ユーザーがハンドラー内でバリデーションを実装** - 完全なコントロール
- レスポンスのZodスキーマ定義は不要（TypeScriptの型推論を活用）
- リクエストパラメータの省略対応
- IpcMainInvokeEventをContextに含める設計
- **エラーハンドリングはユーザー側で実装** - Contextも含めて柔軟なエラー処理が可能

## ライブラリとしての提供形態

### npmパッケージ
```bash
npm install --save-dev electron-flow
```

### 提供されるコマンド
```bash
# CLIツール
npx electron-flow generate
npx electron-flow watch
npx electron-flow init
npx electron-flow dev
```

## ライブラリの構造

```
electron-flow/ (npmパッケージ)
├── dist/                      # コンパイル済みコード
│   ├── cli/                   # CLIツール
│   ├── generator/             # コード生成エンジン
│   ├── runtime/               # ランタイムユーティリティ
│   │   ├── result.ts          # Result型定義
│   │   └── error.ts           # エラー関連の型
│   └── dev-server/           # 開発サーバー機能
├── src/
│   ├── cli/
│   │   ├── index.ts          # CLIエントリーポイント
│   │   ├── commands/         # 各種コマンド実装
│   │   └── utils/            # CLI用ユーティリティ
│   ├── generator/
│   │   ├── parser.ts         # TypeScript AST解析
│   │   ├── generator.ts      # コード生成ロジック
│   │   ├── templates/        # コードテンプレート
│   │   └── types.ts          # 内部型定義
│   ├── runtime/              # ユーザーが利用する型
│   │   ├── result.ts         # Result型とヘルパー関数
│   │   ├── error.ts          # ErrorValue型定義
│   │   └── index.ts          # エクスポート
│   └── dev-server/
│       ├── watcher.ts        # ファイル監視
│       ├── electron.ts       # Electronプロセス管理
│       └── vite.ts           # Vite統合
├── templates/                 # プロジェクトテンプレート
│   └── basic/                # 基本的なElectronアプリのテンプレート
└── package.json
```

## ユーザーのプロジェクト構造（使用例）

```
my-electron-app/
├── src/
│   ├── main/
│   │   ├── index.ts          # メインプロセス
│   │   ├── context.ts        # Context型定義
│   │   ├── error-handler.ts  # ユーザー定義エラーハンドラー
│   │   └── handlers/         # ユーザー定義のハンドラー（設定で指定）
│   │       ├── author.ts     # 例: getAuthor関数
│   │       └── utils.ts      # 例: calculate関数
│   ├── preload/
│   │   └── index.ts          # プリロードスクリプト
│   ├── renderer/
│   │   └── index.tsx         # レンダラー
│   └── generated/            # electron-flowが生成するコード
│       ├── main/
│       │   └── ipc-handlers.ts
│       ├── preload/
│       │   └── api.ts
│       └── renderer/
│           ├── api.ts
│           └── types.ts
├── electron-flow.config.ts    # 設定ファイル
└── package.json
```

## コード生成フロー

### 1. ユーザーがハンドラーを定義（バリデーション込み）
```typescript
// src/main/handlers/author.ts
import { z } from 'zod';
import type { Context } from '../context';

// Zodスキーマ（ハンドラー内でのバリデーション用）
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

// リクエストパラメータなしの例
export async function getCurrentUser(ctx: Context) {
    if (!ctx.user) {
        throw new ApplicationError('Not authenticated');
    }
    return ctx.user;
}
```

### 2. ユーザーがエラーハンドラーを定義（Contextを受け取る）
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

### 3. electron-flowがコードを生成

#### メインプロセス用
```typescript
// src/generated/main/ipc-handlers.ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { success } from 'electron-flow/runtime';
import type { Context } from '../../main/context';

// ハンドラーのインポート（自動検出）
import { getAuthor } from '../../main/handlers/author';
import { getCurrentUser } from '../../main/handlers/user';

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
}
```

#### プリロード用
```typescript
// src/generated/preload/api.ts
import { contextBridge, ipcRenderer } from 'electron';
import type { Result } from 'electron-flow/runtime';

const electronAPI = {
    getAuthor: (request: any): Promise<Result<any>> => {
        return ipcRenderer.invoke('getAuthor', request);
    },
    getCurrentUser: (): Promise<Result<any>> => {
        return ipcRenderer.invoke('getCurrentUser');
    },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

#### レンダラー用
```typescript
// src/generated/renderer/api.ts
import type { Result, isSuccess } from 'electron-flow/runtime';
import type { GetAuthorRequest } from '../../main/handlers/author';

// 推論された戻り値の型（生成時に解析）
type GetAuthorResponse = {
    id: string;
    name: string;
    email: string;
    // ...
};

type GetCurrentUserResponse = {
    id: string;
    name: string;
    // ...
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
};

// Window型拡張
declare global {
    interface Window {
        electronAPI: {
            getAuthor: (request: any) => Promise<Result<any>>;
            getCurrentUser: () => Promise<Result<any>>;
        };
    }
}
```

## 設定ファイル

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
        // Electronのエントリーポイント
        electronEntry: 'src/main/index.ts',
        
        // Vite設定ファイル（オプション）
        viteConfig: 'vite.config.ts',
        
        // 自動リスタートの対象
        watchPaths: ['src/main/**/*.ts'],
    },
    
    // コード生成オプション
    generation: {
        // チャンネル名の生成方法
        channelNaming: 'functionName', // 関数名をそのまま使用
        
        // 型推論の詳細度
        typeInference: 'full', // 戻り値の型を完全に推論
    },
};

export default config;
```

## 提供される型とユーティリティ

```typescript
// electron-flowからエクスポートされる
export { 
    Result, 
    Success, 
    Failure,
    success,
    failure,
    isSuccess,
    isFailure
} from './runtime/result';

export type { ErrorValue } from './runtime/error';

// ユーザーが定義するContext型のインターフェース
export interface BaseContext {
    event: IpcMainInvokeEvent;
    [key: string]: any;
}
```

## 開発時のワークフロー

1. ユーザーがハンドラー関数を作成/編集（バリデーション込み）
2. ユーザーがエラーハンドラーを実装（Context付きで）
3. electron-flow devコマンドでファイル監視開始
4. 変更を検知して自動的にIPCコードを再生成
5. メインプロセスが再起動
6. Viteサーバーでレンダラーがリロード

## この設計の利点

1. **完全なコントロール** - ユーザーがバリデーションとエラーハンドリングを完全制御
2. **Context付きエラーハンドリング** - ログ出力やサービスアクセスがエラー処理でも可能
3. **分離された関心事** - electron-flowはコード生成に専念、ビジネスロジックはユーザーが制御
4. **型安全性** - Result型により、エラーハンドリングを含めて型安全
5. **柔軟性** - safeParse、parseなど、Zodの全機能を自由に使用可能
6. **テスタビリティ** - ハンドラーとエラーハンドラーを独立してテスト可能
7. **シンプルなコード生成** - 引数をそのまま渡すだけのシンプルな生成コード

## 重要な設計変更

### バリデーションの委譲
- **前回**: electron-flowが自動的にZodバリデーションを挿入
- **今回**: ユーザーがハンドラー内で自分でバリデーションを実装
- **利点**:
  - safeParse、parseの選択が可能
  - カスタムバリデーションロジックの追加が容易
  - ログ出力のタイミングを制御可能
  - 条件付きバリデーションなど複雑な処理に対応

### エラーハンドラーにContextを渡す
- **新機能**: `handleError(ctx: Context, e: unknown)` でContextを受け取る
- **利点**:
  - エラー処理でもロガーやデータベースなどのサービスにアクセス可能
  - より詳細なエラーログの出力が可能
  - ユーザーIDやセッション情報を含むコンテキスト情報をエラーに含められる
  - エラーごとに異なる処理戦略を実装可能

### 生成コードの簡素化
- 引数（args）をそのままハンドラーに渡す
- バリデーションとエラーハンドリングはユーザー実装に委ねる
- より予測可能で理解しやすいコード生成

このアーキテクチャにより、Electronアプリケーション開発者は、最大限の自由度を持ちながら型安全なIPC通信を簡単に構築できます。特にエラーハンドリングにおいてもContextの完全な機能を活用できるため、本格的なアプリケーション開発に適しています。