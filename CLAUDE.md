# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクトガイドライン

- コミットやプッシュは明示的に指示された場合のみ実行
- コメント、ドキュメント、応答は日本語で
- テストファーストでの開発（TDD）を徹底

## 開発コマンド

### テスト実行
```bash
# 基本的なテストコマンド
npm test                          # 全てのテストを実行
npm run test:watch               # 監視モードで開発（TDD推奨）
npm run test:coverage            # カバレッジ付きでテスト実行
npm run tdd                      # TDDモード（詳細出力付き監視）

# 特定のテストファイル実行
npm test src/runtime/__tests__/result.test.ts    # 単一ファイル
npm test src/cli/commands                         # ディレクトリ内全て
npm test -- --testNamePattern="成功時"            # パターンマッチ

# デバッグモード
npm test -- --verbose            # 詳細出力
npm test -- --bail              # 最初のエラーで停止
```

### ビルドと開発
```bash
npm run build              # TypeScriptをdist/にビルド（tsconfig.build.json使用）
npm run dev                # 監視モードでコンパイル
npm run lint               # ESLintチェック
npm run lint:fix           # ESLint自動修正
npm run format             # Prettierフォーマット
npm run format:check       # フォーマットチェック（CI用）
```

### CLIコマンド
```bash
# ローカル開発でのCLIテスト
node bin/electron-flow --help           # ヘルプ表示
node bin/electron-flow init            # プロジェクト初期化
node bin/electron-flow generate        # コード生成
node bin/electron-flow watch           # ファイル監視モード
node bin/electron-flow dev             # 開発サーバー起動

# npxでの実行（パッケージインストール後）
npx electron-flow --version            # バージョン確認
```

## プロジェクト概要

**electron-flow** は、Electronアプリケーション用の型安全なIPCコードジェネレーターです。Resultタイプパターンとユーザー定義エラーハンドリングにより、例外を使わない明示的なエラー処理を実現します。

### 主要な特徴
- 🔒 型安全なIPC通信 - 自動型推論による完全なTypeScriptサポート
- 🎯 Resultタイプパターン - 例外を使わない明示的なエラーハンドリング
- 🛠️ ユーザー定義バリデーション - Zodを使用した完全な制御
- 🎨 コンテキスト対応エラーハンドリング - エラー処理でもサービスへのアクセス可能
- 🚀 開発者フレンドリー - ホットリロード、自動再生成、明確なエラーメッセージ

## アーキテクチャ詳細

### ディレクトリ構造
```
electron-flow/
├── src/
│   ├── runtime/              # ランタイムライブラリ（Result型、ユーティリティ）
│   │   ├── result.ts        # Result<T>型定義と関連関数
│   │   ├── error.ts         # ErrorValue型定義
│   │   └── index.ts         # パブリックAPIエクスポート
│   ├── cli/                 # CLIツール実装
│   │   ├── commands/        # 各コマンド実装（init, generate, watch, dev）
│   │   ├── config-loader.ts # 設定ファイル読み込みとバリデーション
│   │   ├── error.ts         # ElectronFlowErrorクラス
│   │   └── index.ts         # CLIエントリーポイント
│   └── generator/           # コード生成エンジン
│       ├── parser.ts        # TypeScript AST解析
│       ├── generator.ts     # IPCコード生成
│       ├── type-inference.ts # 型推論ロジック
│       └── templates/       # 生成コードテンプレート
├── bin/
│   └── electron-flow        # CLIエントリーポイント
├── docs/                    # アーキテクチャドキュメント
└── __tests__/              # テストファイル（各srcディレクトリ内）
```

### コアコンポーネント

#### 1. ランタイムライブラリ (`src/runtime/`)
**Resultタイプシステム**の実装：
```typescript
type Result<T> = Success<T> | Failure<ErrorValue[]>
type ErrorValue = { path: string; messages: string[] }
```

提供される関数：
- `success<T>(value: T): Success<T>` - 成功結果の作成
- `failure(errors: ErrorValue[]): Failure` - 失敗結果の作成
- `isSuccess(result: Result<any>): boolean` - 成功判定
- `isFailure(result: Result<any>): boolean` - 失敗判定

#### 2. CLI基盤 (`src/cli/`)
Commander.jsベースの4つのコマンド：
- **init**: プロジェクト初期化、基本構造生成
- **generate**: ハンドラーからIPCコード生成
- **watch**: ファイル変更監視と自動再生成
- **dev**: Electron開発サーバー（ホットリロード付き）

#### 3. コード生成エンジン (`src/generator/`)
3段階のパイプライン処理：
1. **Parser**: ts-morphでTypeScriptハンドラーを解析
2. **Type Inference**: 戻り値型の自動推論
3. **Generator**: main/preload/renderer用コード生成

## 実装ステータスとメトリクス

### 現在のステータス
- **総テスト数**: 138テスト（全て通過 ✅）
- **コードカバレッジ**: 85.27%（目標: 90%）
- **実装フェーズ**: 全3フェーズ完了

### カバレッジ詳細
| モジュール | カバレッジ | 状態 | 備考 |
|-----------|-----------|------|------|
| runtime/index.ts | 100% | ✅ | 完全テスト済み |
| cli/commands/dev.ts | 88.46% | ✅ | Electronプロセス管理 |
| cli/config-loader.ts | 72.72% | 🔧 | バリデーション追加中 |
| generator/parser.ts | 62.96% | 🔧 | エッジケース対応中 |
| cli/index.ts | 57.89% | 🔧 | 統合テスト追加中 |

## 主要な設計パターン

### 1. Resultタイプパターン
```typescript
// 成功/失敗を明示的に扱う
Result<T> = Success<T> | Failure<ErrorValue[]>

// 使用例
const result = await api.getAuthor({ id: '123' });
if (isSuccess(result)) {
  console.log(result.value); // 型安全なアクセス
} else {
  console.error(result.value); // ErrorValue[]
}
```

### 2. コンテキスト対応エラーハンドリング
```typescript
// エラーハンドラーでContextを受け取る
export function handleError(ctx: Context, e: unknown) {
  // ロガーやサービスにアクセス可能
  ctx.logger.error('Error occurred', e);
  
  if (e instanceof ValidationError) {
    return failure(toErrorValues(e));
  }
  // ...
}
```

### 3. ユーザー制御バリデーション
```typescript
// ハンドラー内でバリデーションを実装
export async function getAuthor(ctx: Context, request: GetAuthorRequest) {
  // ユーザーが完全に制御
  const valid = getAuthorSchema.safeParse(request);
  if (!valid.success) {
    throw new ValidationError(valid.error);
  }
  // ビジネスロジック...
}
```

## 設定ファイル構造

```typescript
interface ElectronFlowConfig {
  // 必須設定
  handlersDir: string;          // ハンドラーディレクトリ (例: 'src/main/handlers')
  outDir: string;               // 生成先ディレクトリ (例: 'src/generated')
  contextPath: string;          // Context型定義パス (例: 'src/main/context.ts')
  errorHandlerPath: string;     // エラーハンドラーパス (例: 'src/main/error-handler.ts')
  
  // オプション設定
  dev?: {
    electronEntry: string;      // Electronエントリーポイント
    preloadEntry?: string;      // プリロードスクリプト
    viteConfig?: string;        // Vite設定ファイル
    watchPaths?: string[];      // 監視対象パス
  };
  
  generation?: {
    channelNaming?: 'functionName' | 'kebabCase' | 'camelCase';
    typeInference?: 'full' | 'basic';
  };
}
```

## コード生成テンプレート

### メインプロセス生成パターン
```typescript
// ハンドラー登録（生成されるコード）
ipcMain.handle('functionName', async (event: IpcMainInvokeEvent, args: any) => {
  try {
    const result = await handlerFunction({ ...ctx, event }, args);
    return success(result);
  } catch (e) {
    return handleError({ ...ctx, event }, e);
  }
});
```

### レンダラー生成パターン
```typescript
// API関数（生成されるコード）
export const api = {
  author: {
    get: async (request: GetAuthorRequest): Promise<GetAuthorResponse> => {
      const result = await window.electronAPI.getAuthor(request);
      return unwrapResult(result);
    },
  },
};
```

## TDD開発ワークフロー

### 基本的なTDDサイクル
1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限のコードを実装
3. **Refactor**: コードを改善（テストは通ったまま）

### テスト構造例
```typescript
describe('ハンドラーパーサー', () => {
  it('関数名を正しく抽出する', () => {
    // Arrange: テストデータ準備
    const sourceCode = `export async function getAuthor(ctx: Context, request: GetAuthorRequest) {}`;
    
    // Act: 実行
    const result = parser.parseHandlerFunction(sourceCode);
    
    // Assert: 検証
    expect(result.functionName).toBe('getAuthor');
  });
});
```

### モック設定
```typescript
// jest.setup.ts でのモック例
jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  contextBridge: { exposeInMainWorld: jest.fn() },
  ipcRenderer: { invoke: jest.fn() },
}));
```

## エラーハンドリングパターン

### ElectronFlowError使用例
```typescript
try {
  // 操作実行
  const config = await loadConfig(configPath);
  return config;
} catch (error) {
  // 既知のエラーは再スロー
  if (error instanceof ElectronFlowError) {
    throw error;
  }
  // 未知のエラーをラップ
  throw new ElectronFlowError(
    `設定ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    'CONFIG_LOAD_ERROR'
  );
}
```

### エラーコード一覧
- `CONFIG_LOAD_ERROR`: 設定ファイル読み込みエラー
- `HANDLER_PARSE_ERROR`: ハンドラー解析エラー
- `GENERATION_ERROR`: コード生成エラー
- `VALIDATION_ERROR`: バリデーションエラー

## 開発ガイドライン

### 新機能追加の手順
1. **要件定義**: 機能の目的と仕様を明確化
2. **テスト作成**: 期待する動作のテストを先に書く
3. **実装**: テストを通す最小限のコード
4. **リファクタリング**: パフォーマンスと可読性の改善
5. **ドキュメント**: 日本語でのコメントと説明追加

### コーディング規約
- TypeScriptの`strict`モードを使用
- 関数は単一責任の原則に従う
- エラーメッセージは日本語で分かりやすく
- 型定義は明示的に（`any`の使用は最小限）

### デバッグとトラブルシューティング

#### よくある問題と解決方法
1. **設定ファイルが見つからない**
   ```bash
   # 設定ファイルパスを確認
   ls electron-flow.config.ts
   # TypeScriptの場合はビルドが必要
   npm run build
   ```

2. **型推論エラー**
   ```bash
   # 詳細なエラー出力を確認
   npx electron-flow generate --verbose
   ```

3. **ファイル監視が動作しない**
   ```bash
   # chokidarの制限を確認
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   ```

### パフォーマンス最適化

#### 大規模プロジェクトでの推奨設定
```typescript
const config: ElectronFlowConfig = {
  generation: {
    // 基本的な型推論で高速化
    typeInference: 'basic',
    // インクリメンタル生成を有効化
    incremental: true,
  },
  // 監視対象を限定
  dev: {
    watchPaths: ['src/main/handlers/**/*.ts'],
    // デバウンス時間を調整
    debounce: 500,
  },
};
```

## 依存関係

### ランタイム依存関係
- **chalk** (^5.3.0): ターミナル出力の装飾
- **chokidar** (^3.5.3): ファイル監視
- **commander** (^11.1.0): CLIフレームワーク
- **lodash** (^4.17.21): ユーティリティ関数
- **ora** (^8.0.1): スピナー表示
- **ts-morph** (^21.0.1): TypeScript AST操作

### ピア依存関係
- **electron** (>=13.0.0): Electronフレームワーク
- **zod** (>=3.0.0): スキーマバリデーション

### Node.jsバージョン
- 最小要件: v16.0.0以上
- 推奨: v18.0.0以上（パフォーマンス向上）