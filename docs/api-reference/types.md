# 型定義 API リファレンス

electron-flowで使用される主要な型定義とプログラマティックAPIの完全な仕様を説明します。

## コア型定義

### `AutoCodeOption`

electron-flowの設定を定義するメイン型です。

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

詳細は [設定API リファレンス](./config.md) を参照してください。

### `Context`

API関数の第一引数として渡されるコンテキスト型のベース定義です。

```typescript
interface Context {
  event: IpcMainInvokeEvent;
  // ユーザー定義のプロパティは継承して追加
}
```

#### 拡張例

```typescript
interface AppContext extends Context {
  user?: AuthenticatedUser;
  db: DatabaseConnection;
  logger: Logger;
  config: AppConfig;
  session: SessionInfo;
}
```

### `APIResponse<T>`

すべてのAPI関数が返すレスポンス型です。

```typescript
type APIResponse<T> = 
  | SuccessResponse<T>
  | ErrorResponse;

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: ErrorDetails;
}

interface ErrorDetails {
  message: string;
  type: string;
  details?: any;
}
```

## プログラマティック API

### `build` 関数

コード生成を実行する主要な関数です。

```typescript
function build(option: AutoCodeOption): Promise<BuildResult>

interface BuildResult {
  zodObjectInfos: ZodObjectInfo[];
  packages: PackageInfo[];
  generatedFiles: GeneratedFile[];
  stats: BuildStats;
  errors?: BuildError[];
}
```

#### `BuildResult` の詳細

```typescript
interface BuildResult {
  // 解析されたZodスキーマ情報
  zodObjectInfos: ZodObjectInfo[];
  
  // 解析されたパッケージ情報
  packages: PackageInfo[];
  
  // 生成されたファイル情報
  generatedFiles: GeneratedFile[];
  
  // ビルド統計
  stats: BuildStats;
  
  // エラー情報（存在する場合）
  errors?: BuildError[];
}

interface ZodObjectInfo {
  name: string;              // スキーマ名
  filePath: string;          // 定義ファイルパス
  properties: SchemaProperty[];
  exportName: string;        // エクスポート名
}

interface SchemaProperty {
  name: string;              // プロパティ名
  type: string;              // TypeScript型
  optional: boolean;         // オプショナルか
  description?: string;      // 説明（JSDocから）
}

interface PackageInfo {
  name: string;              // パッケージ名（ファイル名から）
  filePath: string;          // ファイルパス
  functions: FunctionInfo[]; // 関数情報
  imports: ImportInfo[];     // インポート情報
  exports: ExportInfo[];     // エクスポート情報
}

interface FunctionInfo {
  name: string;              // 関数名
  parameters: ParameterInfo[];
  returnType: string;        // 戻り値型
  isAsync: boolean;          // async関数か
  schema?: string;           // 対応するZodスキーマ名
  description?: string;      // JSDocコメント
}

interface ParameterInfo {
  name: string;              // パラメータ名
  type: string;              // TypeScript型
  optional: boolean;         // オプショナルか
}

interface ImportInfo {
  source: string;            // インポート元
  imports: string[];         // インポートする名前
  isTypeOnly: boolean;       // type-onlyインポートか
}

interface ExportInfo {
  name: string;              // エクスポート名
  type: 'function' | 'type' | 'schema' | 'variable';
}

interface GeneratedFile {
  path: string;              // 生成先パス
  type: 'preload' | 'handler' | 'types';
  content: string;           // 生成されたコード
  size: number;              // ファイルサイズ（バイト）
  checksum: string;          // チェックサム
}

interface BuildStats {
  filesAnalyzed: number;     // 解析したファイル数
  functionsFound: number;    // 見つかった関数数
  schemasFound: number;      // 見つかったスキーマ数
  duration: number;          // 処理時間（ミリ秒）
  startTime: Date;           // 開始時刻
  endTime: Date;             // 終了時刻
}

interface BuildError {
  type: 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'GENERATION_ERROR';
  message: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  stack?: string;
}
```

#### 使用例

```typescript
import { build } from 'electron-flow';

const result = await build({
  targetPath: "./src/main/api",
  preloadPath: "./src/preload/autogenerate/index.ts",
  registerPath: "./src/main/register/autogenerate/index.ts",
  rendererPath: "./src/renderer/autogenerate/index.d.ts"
});

console.log(`Generated ${result.stats.functionsFound} functions`);
console.log(`Build took ${result.stats.duration}ms`);

if (result.errors && result.errors.length > 0) {
  console.error('Build errors:', result.errors);
}
```

### `watchBuild` 関数

ファイル変更を監視して自動的にコード生成を行う関数です。

```typescript
function watchBuild(
  option: AutoCodeOption,
  callbacks?: WatchCallbacks
): Promise<WatchHandle>
```

#### `WatchCallbacks`

```typescript
interface WatchCallbacks {
  onBuildStart?: () => void;
  onBuildComplete?: (result: BuildResult) => void;
  onBuildError?: (error: BuildError) => void;
  onFileChange?: (filePath: string, eventType: 'add' | 'change' | 'unlink') => void;
  onWatchError?: (error: Error) => void;
}
```

#### `WatchHandle`

```typescript
interface WatchHandle {
  // 監視を停止
  stop(): Promise<void>;
  
  // 監視を再開
  restart(): Promise<void>;
  
  // 現在のステータスを取得
  getStatus(): WatchStatus;
  
  // 手動でビルドを実行
  triggerBuild(): Promise<BuildResult>;
}

interface WatchStatus {
  isWatching: boolean;       // 監視中か
  isPaused: boolean;         // 一時停止中か
  lastBuildTime?: Date;      // 最後のビルド時刻
  lastBuildResult?: BuildResult;
  pendingFiles: string[];    // 変更待ちファイル
  watchedPaths: string[];    // 監視対象パス
}
```

#### 使用例

```typescript
import { watchBuild } from 'electron-flow';

const watcher = await watchBuild(
  {
    targetPath: "./src/main/api",
    preloadPath: "./src/preload/autogenerate/index.ts",
    registerPath: "./src/main/register/autogenerate/index.ts",
    rendererPath: "./src/renderer/autogenerate/index.d.ts"
  },
  {
    onBuildStart: () => console.log('Build started...'),
    onBuildComplete: (result) => {
      console.log(`Build completed: ${result.stats.functionsFound} functions`);
    },
    onBuildError: (error) => console.error('Build error:', error),
    onFileChange: (filePath, eventType) => {
      console.log(`File ${eventType}: ${filePath}`);
    }
  }
);

// 5秒後に停止
setTimeout(async () => {
  await watcher.stop();
  console.log('Watching stopped');
}, 5000);
```

## ユーティリティ関数

### `validateConfig`

設定オブジェクトの妥当性を検証します。

```typescript
function validateConfig(config: any): config is AutoCodeOption

// 使用例
import { validateConfig } from 'electron-flow';

const config = {
  targetPath: "./src/main/api",
  // ...
};

if (validateConfig(config)) {
  // config は AutoCodeOption 型として安全に使用可能
  console.log('Configuration is valid');
} else {
  console.error('Invalid configuration');
}
```

### `getDefaultConfig`

デフォルト設定を取得します。

```typescript
function getDefaultConfig(): AutoCodeOption

// 使用例
import { getDefaultConfig } from 'electron-flow';

const defaultConfig = getDefaultConfig();
console.log('Default target path:', defaultConfig.targetPath);
```

### `loadConfig`

設定ファイルを読み込みます。

```typescript
function loadConfig(path: string): Promise<AutoCodeOption>

// 使用例
import { loadConfig } from 'electron-flow';

try {
  const config = await loadConfig('./electron-flow.config.ts');
  console.log('Configuration loaded successfully');
} catch (error) {
  console.error('Failed to load configuration:', error);
}
```

### `initProject`

プロジェクトの初期化を行います。

```typescript
function initProject(options?: InitOptions): Promise<void>

interface InitOptions {
  configPath?: string;       // 設定ファイルパス
  contextPath?: string;      // Context型定義パス
  force?: boolean;           // 既存ファイルを上書き
  skipContext?: boolean;     // Context型定義ファイルをスキップ
}

// 使用例
import { initProject } from 'electron-flow';

await initProject({
  configPath: './config/electron-flow.config.ts',
  contextPath: './src/shared/types/context.ts',
  force: true
});
```

## エラー型定義

### `ElectronFlowError`

electron-flow固有のエラーのベースクラスです。

```typescript
class ElectronFlowError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ElectronFlowError';
  }
}
```

### 具体的なエラー型

```typescript
// 設定エラー
class ConfigError extends ElectronFlowError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

// 解析エラー
class ParseError extends ElectronFlowError {
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
class GenerationError extends ElectronFlowError {
  constructor(
    public target: string,
    message: string,
    details?: any
  ) {
    super(message, 'GENERATION_ERROR', { target, ...details });
    this.name = 'GenerationError';
  }
}

// ファイルシステムエラー
class FileSystemError extends ElectronFlowError {
  constructor(
    public operation: string,
    public path: string,
    message: string
  ) {
    super(message, 'FILESYSTEM_ERROR', { operation, path });
    this.name = 'FileSystemError';
  }
}
```

## ロガー型定義

### `Logger`

```typescript
interface Logger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  
  // 子ロガー作成
  child(metadata: any): Logger;
  
  // ログレベル設定
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
```

### ロガー関連の関数

```typescript
// デフォルトロガーの取得
function getLogger(name?: string): Logger

// カスタムロガーの設定
function setLogger(logger: Logger): void

// ログレベルの設定
function setLogLevel(level: LogLevel): void

// 使用例
import { getLogger, setLogLevel } from 'electron-flow';

setLogLevel('debug');
const logger = getLogger('my-app');

logger.info('Starting code generation...');
logger.debug('Processing file:', filePath);
```

## テストヘルパー型定義

### `MockContext`

テスト用のモックContext作成関数です。

```typescript
function createMockContext<T extends Context = Context>(
  overrides?: Partial<T>
): T

// 使用例
import { createMockContext } from 'electron-flow/testing';

const mockContext = createMockContext({
  user: { id: '123', role: 'admin' },
  db: mockDatabase
});
```

### `TestBuildOptions`

テスト用ビルドのオプション型です。

```typescript
interface TestBuildOptions extends Partial<AutoCodeOption> {
  tempDir?: string;          // 一時ディレクトリ
  cleanup?: boolean;         // 後始末を行うか
}

function testBuild(
  files: Record<string, string>,
  options?: TestBuildOptions
): Promise<BuildResult>

// 使用例
import { testBuild } from 'electron-flow/testing';

const result = await testBuild({
  'api/users.ts': `
    import { z } from 'zod';
    export const createUserSchema = z.object({
      name: z.string()
    });
    export async function createUser(ctx: Context, request: any) {
      return { id: '1', name: request.name };
    }
  `
}, {
  cleanup: true
});
```

### `ValidationResult`

生成コードの検証結果型です。

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  type: 'SYNTAX_ERROR' | 'TYPE_ERROR' | 'IMPORT_ERROR';
}

interface ValidationWarning {
  message: string;
  line?: number;
  column?: number;
  type: 'STYLE_WARNING' | 'PERFORMANCE_WARNING';
}

function validateGeneratedCode(
  code: string,
  type: 'preload' | 'handler' | 'types'
): ValidationResult
```

## 型ガード関数

### `isAutoCodeOption`

```typescript
function isAutoCodeOption(obj: any): obj is AutoCodeOption {
  return (
    typeof obj === 'object' &&
    typeof obj.targetPath === 'string' &&
    typeof obj.preloadPath === 'string' &&
    typeof obj.registerPath === 'string' &&
    typeof obj.rendererPath === 'string'
  );
}
```

### `isBuildResult`

```typescript
function isBuildResult(obj: any): obj is BuildResult {
  return (
    typeof obj === 'object' &&
    Array.isArray(obj.zodObjectInfos) &&
    Array.isArray(obj.packages) &&
    Array.isArray(obj.generatedFiles) &&
    typeof obj.stats === 'object'
  );
}
```

これらの型定義を理解することで、electron-flowをプログラマティックに使用したり、カスタムツールを構築したりできます。