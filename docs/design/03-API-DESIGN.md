# API設計書

## 1. API設計概要

electron-flowは3つのレベルのAPIを提供します：

1. **CLI API** - コマンドラインインターフェース
2. **プログラマティックAPI** - Node.jsから直接使用可能なAPI
3. **設定API** - 設定ファイルを通じた動作制御

## 2. CLI API

### 2.1 コマンド一覧

#### 2.1.1 initコマンド
```bash
npx electron-flow init [options]
```

**機能**: プロジェクトの初期設定を行い、必要なファイルを生成

**オプション**:
```
--config-path <path>    設定ファイルの出力パス (デフォルト: ./electron-flow.config.ts)
--context-path <path>   Context型定義の出力パス (デフォルト: ./src/types/context.ts)
--force                 既存ファイルを上書き
--skip-context         Context型定義ファイルの生成をスキップ
```

**生成ファイル**:
1. `electron-flow.config.ts` - 設定ファイル
2. `src/types/context.ts` - Context型定義（オプション）

#### 2.1.2 genコマンド
```bash
npx electron-flow gen [options]
```

**機能**: 設定に基づいてIPC通信コードを生成

**オプション**:
```
--config <path>         設定ファイルのパス (デフォルト: ./electron-flow.config.ts)
--watch                 ファイル変更を監視して自動生成
--verbose              詳細なログ出力
--dry-run              実際のファイル生成を行わずに確認
```

### 2.2 CLI実装設計

```typescript
interface CLICommand {
    name: string;
    description: string;
    options: CLIOption[];
    action: (options: any) => Promise<void>;
}

interface CLIOption {
    flag: string;
    description: string;
    defaultValue?: any;
    required?: boolean;
}

class CLI {
    private commands: Map<string, CLICommand>;
    
    // コマンドの登録
    registerCommand(command: CLICommand): void
    
    // コマンドライン解析と実行
    async execute(args: string[]): Promise<void>
    
    // ヘルプ表示
    showHelp(commandName?: string): void
}
```

## 3. プログラマティックAPI

### 3.1 主要エクスポート関数

#### 3.1.1 build関数
```typescript
export async function build(option: AutoCodeOption): Promise<BuildResult>

interface BuildResult {
    zodObjectInfos: ZodObjectInfo[];
    packages: PackageInfo[];
    generatedFiles: GeneratedFile[];
    stats: BuildStats;
}

interface GeneratedFile {
    path: string;
    type: 'preload' | 'handler' | 'types';
    size: number;
}

interface BuildStats {
    filesAnalyzed: number;
    functionsFound: number;
    schemasFound: number;
    duration: number;
}
```

#### 3.1.2 watchBuild関数
```typescript
export async function watchBuild(
    option: AutoCodeOption,
    callbacks?: WatchCallbacks
): Promise<WatchHandle>

interface WatchCallbacks {
    onBuildStart?: () => void;
    onBuildComplete?: (result: BuildResult) => void;
    onBuildError?: (error: Error) => void;
    onFileChange?: (filePath: string) => void;
}

interface WatchHandle {
    stop(): Promise<void>;
    restart(): Promise<void>;
    getStatus(): WatchStatus;
}

interface WatchStatus {
    isWatching: boolean;
    lastBuildTime?: Date;
    pendingFiles: string[];
}
```

### 3.2 ユーティリティ関数

```typescript
// 設定の検証
export function validateConfig(config: any): config is AutoCodeOption

// デフォルト設定の取得
export function getDefaultConfig(): AutoCodeOption

// 設定ファイルの読み込み
export async function loadConfig(path: string): Promise<AutoCodeOption>

// プロジェクトの初期化
export async function initProject(options?: InitOptions): Promise<void>

interface InitOptions {
    configPath?: string;
    contextPath?: string;
    force?: boolean;
    skipContext?: boolean;
}
```

## 4. 設定API

### 4.1 AutoCodeOption型定義

```typescript
interface AutoCodeOption {
    // 基本設定
    targetPath: string;              // APIディレクトリのパス
    ignores: string[];               // 除外する関数名のリスト
    
    // 出力先設定
    preloadPath: string;             // プリロード生成先パス
    registerPath: string;            // レジスタ生成先パス
    rendererPath: string;            // レンダラー型定義生成先パス
    
    // オプション設定
    contextPath?: string;            // Context型定義ファイルのパス
    errorHandler?: ErrorHandlerConfig; // エラーハンドリング設定
    
    // 高度な設定
    advanced?: AdvancedOptions;
}

interface ErrorHandlerConfig {
    handlerPath: string;             // エラーハンドラー関数のパス
    handlerName: string;             // エクスポートされた関数名
    defaultHandler?: boolean;        // デフォルトハンドラーも併用
}

interface AdvancedOptions {
    // パフォーマンス設定
    concurrency?: number;            // 並列処理数（デフォルト: 4）
    cache?: boolean;                 // キャッシュ有効化（デフォルト: true）
    
    // 生成オプション
    generateSourceMap?: boolean;     // ソースマップ生成
    minify?: boolean;               // コード圧縮
    
    // デバッグ設定
    debug?: boolean;                // デバッグモード
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
}
```

### 4.2 設定例

#### 基本的な設定
```typescript
export const autoCodeOption: AutoCodeOption = {
    targetPath: "./src/main/api",
    ignores: [],
    preloadPath: "./src/preload/autogenerate/index.ts",
    registerPath: "./src/main/register/autogenerate/index.ts",
    rendererPath: "./src/renderer/autogenerate/index.d.ts"
};
```

#### 高度な設定
```typescript
export const autoCodeOption: AutoCodeOption = {
    // 基本設定
    targetPath: "./src/main/api",
    ignores: ["internal*", "_*"],
    preloadPath: "./src/preload/autogenerate/index.ts",
    registerPath: "./src/main/register/autogenerate/index.ts",
    rendererPath: "./src/renderer/autogenerate/index.d.ts",
    
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
        logLevel: 'info'
    }
};
```

## 5. Context API

### 5.1 Context型定義

```typescript
// 基本Context型（ユーザーが拡張）
export interface Context {
    event: IpcMainInvokeEvent;      // Electronイベント
    // ユーザー定義のプロパティ
}

// 生成される拡張例
export interface AppContext extends Context {
    db: DatabaseConnection;         // データベース接続
    user?: AuthenticatedUser;       // 認証済みユーザー
    logger: Logger;                 // ロガー
    config: AppConfig;              // アプリケーション設定
}
```

### 5.2 Context使用パターン

```typescript
// API関数でのContext使用
export async function createUser(
    ctx: Context,
    request: CreateUserRequest
): Promise<User> {
    // 認証チェック
    if (!ctx.user) {
        throw new UnauthorizedError();
    }
    
    // ロギング
    ctx.logger.info('Creating user', { request });
    
    // データベース操作
    const user = await ctx.db.users.create({
        data: request,
        createdBy: ctx.user.id
    });
    
    return user;
}
```

## 6. 生成されるAPI

### 6.1 レンダラー側API

```typescript
// window.electronAPI の型定義
interface ElectronAPI {
    // 各API関数（自動生成）
    [functionName: string]: (...args: any[]) => Promise<Result<any>>;
}

// Result型
type Result<T> = 
    | { success: true; data: T }
    | { success: false; error: ErrorDetails };

interface ErrorDetails {
    message: string;
    type: string;
    details?: any;
}
```

### 6.2 使用例

```typescript
// レンダラー側での使用
async function createNewUser(name: string, email: string) {
    const result = await window.electronAPI.createUser({ name, email });
    
    if (result.success) {
        console.log('User created:', result.data);
        return result.data;
    } else {
        console.error('Error:', result.error.message);
        throw new Error(result.error.message);
    }
}
```

## 7. プラグインAPI（将来拡張）

### 7.1 プラグインインターフェース

```typescript
interface ElectronFlowPlugin {
    name: string;
    version: string;
    
    // フック
    hooks?: {
        beforeParse?: (files: string[]) => string[] | Promise<string[]>;
        afterParse?: (result: ParseResult) => ParseResult | Promise<ParseResult>;
        beforeGenerate?: (data: GenerateData) => GenerateData | Promise<GenerateData>;
        afterGenerate?: (code: GeneratedCode) => GeneratedCode | Promise<GeneratedCode>;
    };
    
    // カスタムジェネレーター
    generators?: {
        [key: string]: CustomGenerator;
    };
}

interface CustomGenerator {
    name: string;
    generate(data: GenerateData): Promise<string>;
    outputPath: string;
}
```

## 8. エラーAPI

### 8.1 エラークラス階層

```typescript
// 基底エラー
export class ElectronFlowError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = 'ElectronFlowError';
    }
}

// 設定エラー
export class ConfigError extends ElectronFlowError {
    constructor(message: string, details?: any) {
        super(message, 'CONFIG_ERROR', details);
        this.name = 'ConfigError';
    }
}

// 解析エラー
export class ParseError extends ElectronFlowError {
    constructor(
        public filePath: string,
        message: string,
        details?: any
    ) {
        super(message, 'PARSE_ERROR', { filePath, ...details });
        this.name = 'ParseError';
    }
}

// 生成エラー
export class GenerationError extends ElectronFlowError {
    constructor(
        public target: string,
        message: string,
        details?: any
    ) {
        super(message, 'GENERATION_ERROR', { target, ...details });
        this.name = 'GenerationError';
    }
}
```

## 9. ロギングAPI

### 9.1 ロガーインターフェース

```typescript
interface Logger {
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    
    // 子ロガー作成
    child(metadata: any): Logger;
}

// デフォルトロガーの取得
export function getLogger(name?: string): Logger;

// カスタムロガーの設定
export function setLogger(logger: Logger): void;
```

## 10. テストヘルパーAPI

### 10.1 テスト用ユーティリティ

```typescript
// モックContext作成
export function createMockContext(overrides?: Partial<Context>): Context;

// テスト用ビルド
export async function testBuild(
    files: Record<string, string>,
    option?: Partial<AutoCodeOption>
): Promise<BuildResult>;

// 生成コードの検証
export function validateGeneratedCode(
    code: string,
    type: 'preload' | 'handler' | 'types'
): ValidationResult;
```

## 11. APIバージョニング

### 11.1 バージョン管理

```typescript
// APIバージョン情報
export const API_VERSION = {
    major: 1,
    minor: 0,
    patch: 0,
    toString(): string
};

// 互換性チェック
export function checkCompatibility(
    requiredVersion: string
): CompatibilityResult;

interface CompatibilityResult {
    compatible: boolean;
    reason?: string;
    upgradeInstructions?: string;
}
```