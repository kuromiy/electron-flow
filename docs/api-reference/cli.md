# CLI API リファレンス

electron-flowのコマンドライン インターフェース（CLI）の完全な仕様を説明します。

## 概要

electron-flowのCLIは2つの主要コマンドを提供します：

- `init` - プロジェクトの初期化
- `gen` - コード生成

## グローバルオプション

すべてのコマンドで使用可能なオプション：

```bash
--help, -h        ヘルプを表示
--version, -v     バージョンを表示
--verbose         詳細なログ出力
--quiet, -q       最小限のログ出力
```

## `init` コマンド

プロジェクトの初期化を行い、必要な設定ファイルを生成します。

### 基本的な使用方法

```bash
npx electron-flow init [options]
```

### オプション

#### `--config-path <path>`
- **型**: `string`
- **デフォルト**: `./electron-flow.config.ts`
- **説明**: 設定ファイルの出力パス

```bash
npx electron-flow init --config-path ./config/electron-flow.config.ts
```

#### `--context-path <path>`
- **型**: `string`
- **デフォルト**: `./src/types/context.ts`
- **説明**: Context型定義ファイルの出力パス

```bash
npx electron-flow init --context-path ./src/shared/types/context.ts
```

#### `--force`
- **型**: `boolean`
- **デフォルト**: `false`
- **説明**: 既存ファイルを上書きして強制実行

```bash
npx electron-flow init --force
```

#### `--skip-context`
- **型**: `boolean`
- **デフォルト**: `false`
- **説明**: Context型定義ファイルの生成をスキップ

```bash
npx electron-flow init --skip-context
```

#### `--api-path <path>`
- **型**: `string`
- **デフォルト**: `./src/main/api`
- **説明**: API ディレクトリのパス（設定ファイルで使用）

```bash
npx electron-flow init --api-path ./src/backend/api
```

#### `--preload-path <path>`
- **型**: `string`
- **デフォルト**: `./src/preload/autogenerate/index.ts`
- **説明**: プリロードスクリプトの生成先パス（設定ファイルで使用）

```bash
npx electron-flow init --preload-path ./src/preload/generated/api.ts
```

#### `--register-path <path>`
- **型**: `string`
- **デフォルト**: `./src/main/register/autogenerate/index.ts`
- **説明**: IPCハンドラーの生成先パス（設定ファイルで使用）

```bash
npx electron-flow init --register-path ./src/main/handlers/generated/api.ts
```

#### `--renderer-path <path>`
- **型**: `string`
- **デフォルト**: `./src/renderer/autogenerate/index.d.ts`
- **説明**: レンダラー型定義の生成先パス（設定ファイルで使用）

```bash
npx electron-flow init --renderer-path ./src/renderer/types/generated/api.d.ts
```

### 実行例

```bash
# 基本的な初期化
npx electron-flow init

# カスタムパスでの初期化
npx electron-flow init \
  --config-path ./config/electron-flow.config.ts \
  --context-path ./src/shared/types/context.ts \
  --api-path ./src/backend/api

# 既存ファイルを上書きして初期化
npx electron-flow init --force

# Context型定義ファイルなしで初期化
npx electron-flow init --skip-context
```

### 生成されるファイル

#### 設定ファイル (`electron-flow.config.ts`)

```typescript
import { AutoCodeOption } from 'electron-flow';

export const autoCodeOption: AutoCodeOption = {
  targetPath: "./src/main/api",
  ignores: [],
  preloadPath: "./src/preload/autogenerate/index.ts",
  registerPath: "./src/main/register/autogenerate/index.ts",
  rendererPath: "./src/renderer/autogenerate/index.d.ts",
  contextPath: "./src/types/context.ts"
};
```

#### Context型定義ファイル (`src/types/context.ts`)

```typescript
import { IpcMainInvokeEvent } from 'electron';

export interface Context {
  event: IpcMainInvokeEvent;
  // アプリケーション固有のプロパティをここに追加
}
```

## `gen` コマンド

設定に基づいてIPC通信コードを生成します。

### 基本的な使用方法

```bash
npx electron-flow gen [options]
```

### オプション

#### `--config <path>`
- **型**: `string`
- **デフォルト**: `./electron-flow.config.ts`
- **説明**: 設定ファイルのパス

```bash
npx electron-flow gen --config ./config/electron-flow.config.ts
```

#### `--watch`
- **型**: `boolean`
- **デフォルト**: `false`
- **説明**: ファイル変更を監視して自動生成

```bash
npx electron-flow gen --watch
```

#### `--dry-run`
- **型**: `boolean`
- **デフォルト**: `false`
- **説明**: 実際のファイル生成を行わずに確認

```bash
npx electron-flow gen --dry-run
```

#### `--debug`
- **型**: `boolean`
- **デフォルト**: `false`
- **説明**: デバッグモードで実行

```bash
npx electron-flow gen --debug
```

#### `--output-format <format>`
- **型**: `'typescript' | 'javascript'`
- **デフォルト**: `'typescript'`
- **説明**: 出力ファイルの形式

```bash
npx electron-flow gen --output-format javascript
```

#### `--concurrency <number>`
- **型**: `number`
- **デフォルト**: `4`
- **説明**: 並列処理数

```bash
npx electron-flow gen --concurrency 8
```

### 実行例

```bash
# 基本的なコード生成
npx electron-flow gen

# ファイル監視モードで実行
npx electron-flow gen --watch

# デバッグモードで詳細確認
npx electron-flow gen --debug --verbose

# ドライランで生成内容確認
npx electron-flow gen --dry-run --verbose

# カスタム設定ファイルで実行
npx electron-flow gen --config ./config/custom.config.ts

# 高並列処理で高速生成
npx electron-flow gen --concurrency 16
```

## 出力とログ

### 標準出力

```bash
$ npx electron-flow gen
✓ Configuration loaded: ./electron-flow.config.ts
✓ Scanning API files in: ./src/main/api
✓ Found 12 API functions in 4 files
✓ Analyzing Zod schemas...
✓ Generating preload script: ./src/preload/autogenerate/index.ts
✓ Generating IPC handlers: ./src/main/register/autogenerate/index.ts
✓ Generating type definitions: ./src/renderer/autogenerate/index.d.ts
✓ Code generation completed successfully in 1.2s

Generated files:
  - Preload:     15 functions, 2.1KB
  - Handlers:    15 functions, 3.8KB
  - Types:       15 functions, 1.9KB
```

### 詳細ログ (`--verbose`)

```bash
$ npx electron-flow gen --verbose
[INFO] Loading configuration from: ./electron-flow.config.ts
[INFO] Target directory: ./src/main/api
[INFO] Ignore patterns: []
[DEBUG] Scanning file: ./src/main/api/users.ts
[DEBUG] Found function: createUser
[DEBUG] Found function: getUsers
[DEBUG] Found function: updateUser
[DEBUG] Found function: deleteUser
[DEBUG] Found Zod schema: createUserSchema
[DEBUG] Found Zod schema: updateUserSchema
[INFO] Analysis complete: 12 functions, 8 schemas
[INFO] Generating preload script...
[DEBUG] Writing file: ./src/preload/autogenerate/index.ts
[INFO] Generating IPC handlers...
[DEBUG] Writing file: ./src/main/register/autogenerate/index.ts
[INFO] Generating type definitions...
[DEBUG] Writing file: ./src/renderer/autogenerate/index.d.ts
[INFO] Code generation completed successfully
```

### エラー出力

#### 設定ファイルエラー

```bash
$ npx electron-flow gen
✗ Error: Configuration file not found: ./electron-flow.config.ts

Please run 'npx electron-flow init' to create a configuration file.
```

#### パースエラー

```bash
$ npx electron-flow gen
✗ Error: Failed to parse API file: ./src/main/api/users.ts

SyntaxError: Unexpected token '}' at line 25, column 3

Please fix the syntax error and try again.
```

#### バリデーションエラー

```bash
$ npx electron-flow gen
✗ Error: Invalid function signature in ./src/main/api/users.ts

Function 'createUser' must have Context as first parameter.
Expected: createUser(ctx: Context, ...)
Found:    createUser(request: CreateUserRequest)
```

## 終了コード

| コード | 説明 |
|--------|------|
| 0 | 成功 |
| 1 | 設定エラー |
| 2 | パースエラー |
| 3 | バリデーションエラー |
| 4 | ファイル I/O エラー |
| 5 | システムエラー |

## 環境変数

### `ELECTRON_FLOW_CONFIG`
- **説明**: デフォルトの設定ファイルパス
- **デフォルト**: `./electron-flow.config.ts`

```bash
export ELECTRON_FLOW_CONFIG=./config/production.config.ts
npx electron-flow gen
```

### `ELECTRON_FLOW_LOG_LEVEL`
- **説明**: ログレベル
- **値**: `error` | `warn` | `info` | `debug`
- **デフォルト**: `info`

```bash
export ELECTRON_FLOW_LOG_LEVEL=debug
npx electron-flow gen
```

### `ELECTRON_FLOW_NO_COLOR`
- **説明**: カラー出力の無効化
- **値**: `true` | `false`
- **デフォルト**: `false`

```bash
export ELECTRON_FLOW_NO_COLOR=true
npx electron-flow gen
```