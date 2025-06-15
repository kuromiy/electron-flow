# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリでコードを扱う際のガイダンスを提供します。

## プロジェクトガイドライン

- コミットやプッシュはこちらでやる
- コメント、ドキュメント、応答は日本語で

## 開発コマンド

### テスト
```bash
npm test                    # 全てのテストを実行
npm run test:watch         # 監視モードで開発
npm run test:coverage      # カバレッジ付きでテスト実行
npm run tdd                # TDDモード（詳細出力）
npm test src/path/file.test.ts  # 特定のテストファイルを実行
```

### ビルドと開発
```bash
npm run build              # TypeScriptをdist/にビルド
npm run dev                # 監視モードでコンパイル
npm run lint               # ESLintチェック
npm run lint:fix           # ESLint自動修正
npm run format             # Prettierフォーマット
```

### CLIテスト
```bash
node bin/electron-flow --help    # CLIコマンドをローカルでテスト
```

## アーキテクチャ概要

### コアコンポーネント

**electron-flow** は、Resultタイプパターンを実装し、明示的なエラーハンドリングを提供するElectronアプリケーション用の型安全なIPCコードジェネレーターです。

#### 1. ランタイムライブラリ (`src/runtime/`)
- **Resultタイプシステム**: `Result<T> = Success<T> | Failure<ErrorValue[]>`
- **エラーハンドリング**: パスとメッセージを持つ`ErrorValue`インターフェース
- **ユーティリティ**: `success()`, `failure()`, `isSuccess()`, `isFailure()` 関数
- ステータス: ✅ **完了** - 全テスト通過

#### 2. CLI基盤 (`src/cli/`)
- **コマンド構造**: Commander.jsベースのCLIで4つのメインコマンド
- **設定**: バリデーション付きTypeScript設定ローダー
- **エラーハンドリング**: 日本語メッセージ付きカスタムElectronFlowError
- **コマンド**: `init`, `generate`, `watch`, `dev`
- ステータス: ✅ **完了** - 全コマンド実装済み

#### 3. コード生成エンジン (`src/generator/`)
- **パーサー**: ts-morphを使用したTypeScript AST解析
- **ジェネレーター**: main/preload/renderer用IPCコード生成
- **型推論**: 自動型検出と生成
- ステータス: ✅ **完了** - 完全実装

### 実装ステータス

**現在のステータス: 全フェーズ完了 (138/138 テスト通過)**

- **フェーズ1** ✅: ライブラリ基盤 (ランタイム + CLI基盤)
- **フェーズ2** ✅: コード生成エンジン 
- **フェーズ3** ✅: CLIコマンド実装
- **カバレッジ**: 77.68% (目標: 90%)

### 主要な設計決定

1. **ユーザー制御バリデーション**: ハンドラーでバリデーションを実装（自動生成ではない）
2. **コンテキスト対応エラーハンドリング**: `handleError(ctx: Context, e: unknown)` がコンテキストを受け取る
3. **Resultタイプパターン**: 例外なしの明示的な成功/失敗ハンドリング
4. **TDDアプローチ**: 90%以上のカバレッジ要件を持つテストファーストな開発

### 設定構造

```typescript
interface ElectronFlowConfig {
  handlersDir: string;          // ハンドラー関数ディレクトリ
  outDir: string;               // 生成されたコードの出力先
  contextPath: string;          // Context型定義へのパス
  errorHandlerPath: string;     // エラーハンドラー実装へのパス
  dev?: DevConfig;              // 開発サーバーオプション
  generation?: GenerationConfig; // コード生成オプション
}
```

### CLIコマンド実装

#### Generateコマンド (`generate.ts`)
- ts-morphを使用して設定読み込みとハンドラー解析
- main/preload/rendererターゲット用の型安全なIPCコード生成
- ドライランモードと適切なエラーハンドリングでファイルI/O対応

#### Initコマンド (`init.ts`)
- 合理的なデフォルトでプロジェクト構造を作成
- 設定ファイル、context.ts、error-handler.ts、サンプルハンドラーを生成
- 既存ファイル上書き用のforceオプション対応

#### Watchコマンド (`watch.ts`)
- chokidarでハンドラー、コンテキスト、設定ファイルのファイル監視
- デバウンス付き自動再生成（300ms）と視覚的フィードバック
- 優雅なシャットダウンとエラー回復

#### Devコマンド (`dev.ts`)
- Electronプロセス管理付き開発サーバー
- 変更時の自動プロセス再起動付きファイル監視
- Electronホットリロードとコード生成の統合（500msデバウンス）

### コード生成アーキテクチャ

ジェネレーターはパイプラインアーキテクチャに従います：

1. **パーサー** (`parser.ts`): ts-morphを使用したTypeScriptハンドラー解析
   - 関数シグネチャ、パラメータ、戻り値型の抽出
   - JSDocコメントとオプショナルパラメータの処理
   - ハンドラー構造とエクスポートの検証

2. **型推論** (`type-inference.ts`): スマートな型検出
   - 値とTypeScript ASTノードからの型推論
   - ユニオン型の作成とPromise/Resultパターンの処理
   - 型互換性チェックの提供

3. **ジェネレーター** (`generator.ts`): ターゲット用コード生成
   - **メインプロセス**: Resultパターンラッピング付きIPCハンドラー
   - **プリロード**: 型安全なAPIブリッジ関数
   - **レンダラー**: 完全なTypeScriptサポート付きクライアント側API

### テスト戦略

- **TDDアプローチ**: Red-Green-Refactorサイクル
- **テスト構造**: 日本語テスト名でArrange-Act-Assertパターン
- **モック戦略**: Electron、fs、ts-morphの包括的モック
- **カバレッジ改善が必要な領域**:
  - `cli/index.ts`: 0% (CLIエントリーポイント)
  - `runtime/index.ts`: 0% (APIエクスポート)
  - `cli/config-loader.ts`: 58% (エラーハンドリング)
  - `cli/commands/dev.ts`: 59% (Electronプロセス管理)
  - `generator/parser.ts`: 73% (エッジケース)

### エラーハンドリングパターン

コードベースは`ElectronFlowError`で一貫したエラーハンドリングを使用：

```typescript
// 標準エラーラッピングパターン
try {
  // 操作
} catch (error) {
  if (error instanceof ElectronFlowError) {
    throw error;
  }
  throw new ElectronFlowError(
    `操作に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    'OPERATION_FAILED'
  );
}
```

### 開発ガイドライン

#### 新機能の追加
1. 最初にテストを作成（TDD）
2. 最小限の実行可能な機能を実装
3. 明確性とパフォーマンスのためにリファクタリング
4. 日本語のコメントとメッセージを確実に
5. 関連ドキュメントの更新

#### 新コンポーネントのテスト
- ソースと同じ場所の`__tests__/`ディレクトリにテストを配置
- 説明的な日本語テスト名を使用
- 外部依存関係（Electron、ファイルシステム）をモック
- 新しいコードで90%以上のカバレッジを目標

#### コード生成パターン

ジェネレーターを拡張する際は、これらのパターンに従ってください：

```typescript
// メインプロセス用ターゲット生成パターン
ipcMain.handle('functionName', async (event: IpcMainInvokeEvent, args: any) => {
  try {
    const result = await handlerFunction({ ...ctx, event }, args);
    return success(result);
  } catch (e) {
    return handleError({ ...ctx, event }, e);
  }
});
```

### 依存関係とピア依存関係

- **ランタイム依存関係**: chalk, chokidar, commander, lodash, ora, ts-morph
- **ピア依存関係**: electron (>=13.0.0), zod (>=3.0.0)
- **Nodeバージョン**: >=16.0.0

このプロジェクトは最新のElectronアプリケーションで動作するよう設計されており、ユーザー定義のバリデーションスキーマにZodが必要です。