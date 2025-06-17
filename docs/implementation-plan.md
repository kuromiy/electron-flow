# 実装計画

## フェーズ1: ライブラリ基盤の構築（TDD開始）

### 1.1 プロジェクト初期設定
- [x] アーキテクチャ設計書の作成
- [x] API設計書の作成
- [ ] package.jsonの作成（ライブラリとして）
- [ ] TypeScript設定ファイルの作成
  - tsconfig.json (ベース設定)
  - tsconfig.build.json (ビルド用)
- [ ] ESLint/Prettier設定
- [ ] .gitignoreの作成
- [ ] LICENSE、README.mdの作成
- [ ] **テスト環境のセットアップ（TDD対応）**
  - Jest設定
  - テストユーティリティ
  - モック機能の準備

### 1.2 ランタイムライブラリの実装
- [ ] Result型の実装（src/runtime/result.ts）
- [ ] ErrorValue型の実装（src/runtime/error.ts）
- [ ] ランタイムのエクスポート設定

### 1.3 基本構造の実装
- [ ] CLIエントリーポイント（bin/electron-flow）
- [ ] コマンド構造の実装（commander使用）
- [ ] 設定ファイルローダー
- [ ] エラーハンドリング基盤

## フェーズ2: コード生成エンジンの実装

### 2.1 パーサーの実装
- [ ] ts-morphのセットアップ
- [ ] ハンドラーファイルの検出（単一ディレクトリから）
- [ ] 関数シグネチャの解析
  - 関数名の抽出
  - パラメータの解析（Context必須、request省略可）
  - 戻り値の型推論
  - async/sync判定
- [ ] **バリデーションはハンドラー内で実装される前提での解析**
  - Zodスキーマは参考情報として検出（生成には使用しない）
  - 引数をそのまま渡すシンプルな生成パターン
- [ ] **Context付きエラーハンドラーファイルの解析**
  - handleError関数の検出（Context付き）
  - インポートパスの取得
  - 関数シグネチャの検証
- [ ] メタデータの収集と構造化

### 2.2 ジェネレーターの実装
- [ ] テンプレートシステムの構築
- [ ] メインプロセス用コード生成
  - Result型でのラップ
  - **引数をそのまま渡すシンプルなパターン**
  - **Context付きhandleError関数の呼び出し**
  - IpcMainInvokeEventの注入
- [ ] プリロード用コード生成
  - contextBridge API
  - Result型を含む型定義
- [ ] レンダラー用コード生成
  - APIクライアント（unwrapResult使用）
  - 推論された戻り値の型定義
  - Window型拡張

### 2.3 型推論システム
- [ ] 関数の戻り値型の解析
- [ ] 型定義の生成
- [ ] 複雑な型（Union、Intersection等）の対応

### 2.4 ファイル出力システム
- [ ] 生成ファイルの管理
- [ ] 既存ファイルのバックアップ
- [ ] ドライラン機能
- [ ] フォーマッター統合（Prettier）

## フェーズ3: CLIコマンドの実装

### 3.1 initコマンド
- [ ] プロジェクトテンプレート作成
- [ ] 基本的なディレクトリ構造の生成
- [ ] 設定ファイル生成
- [ ] **Context付きエラーハンドラーテンプレートの生成**
- [ ] サンプルハンドラー生成

### 3.2 generateコマンド
- [ ] 設定ファイル読み込み
- [ ] ハンドラー検出とパース
- [ ] **Context付きエラーハンドラーの検出とパース**
- [ ] コード生成実行
- [ ] 進捗表示
- [ ] エラーレポート

### 3.3 watchコマンド
- [ ] ファイル監視システム（chokidar）
- [ ] 変更検知と再生成
- [ ] インクリメンタル生成

### 3.4 devコマンド
- [ ] watchコマンドの機能を含む
- [ ] Electronプロセス管理
- [ ] Vite統合
- [ ] プロセスの自動リスタート

## フェーズ4: 開発体験の向上

### 4.1 エラーレポート
- [ ] 詳細なエラーメッセージ
- [ ] スタックトレースの整形
- [ ] 解決策の提案
- [ ] 型推論エラーの分かりやすい表示
- [ ] **Context付きエラーハンドラー関連のエラー報告**

### 4.2 デバッグ機能
- [ ] 生成コードのソースマップ
- [ ] デバッグログ出力
- [ ] 診断モード
- [ ] 生成コードのプレビュー

### 4.3 パフォーマンス最適化
- [ ] インクリメンタル生成
- [ ] キャッシング機構
- [ ] 並列処理
- [ ] 大規模プロジェクト対応

## フェーズ5: テストとドキュメント

### 5.1 テスト実装
- [ ] ユニットテスト
  - Result型のテスト
  - パーサーのテスト
  - ジェネレーターのテスト
  - CLIコマンドのテスト
- [ ] 統合テスト
  - サンプルプロジェクトでのE2Eテスト
  - 各種パターンのハンドラーテスト
  - **Context付きエラーハンドラーのテスト**
  - エラーケースのテスト

### 5.2 ドキュメント
- [ ] APIドキュメント
- [ ] 使用ガイド
- [ ] サンプルプロジェクト
- [ ] トラブルシューティングガイド
- [ ] **Context付きエラーハンドリングのベストプラクティス**
- [ ] 移行ガイド

## フェーズ6: 公開準備

### 6.1 パッケージング
- [ ] npm公開設定
- [ ] バージョニング戦略
- [ ] CI/CD設定（GitHub Actions）
- [ ] リリースノート自動生成

### 6.2 品質保証
- [ ] コードカバレッジ（目標: 80%以上）
- [ ] 型チェック
- [ ] Lintチェック
- [ ] セキュリティ監査

## 技術的な実装詳細

### ハンドラー関数の検出パターン
```typescript
// エクスポートされた関数を検出
const functionPattern = /export\s+(async\s+)?function\s+(\w+)/;

// 対応するスキーマを検出（オプション、参考情報のみ）
const schemaPattern = /export\s+const\s+(\w+)Schema\s*=\s*z\./;

// 関数とスキーマのマッチング
// 関数名 + Schema = スキーマ名（例: getAuthor → getAuthorSchema）
```

### Context付きエラーハンドラーの検出
```typescript
// Context付きhandleError関数の検出
const errorHandlerPattern = /export\s+function\s+handleError\s*\(\s*ctx\s*:\s*Context\s*,\s*e\s*:\s*unknown\s*\)/;

// エラーハンドラーファイルの解析
interface ErrorHandlerInfo {
    filePath: string;
    functionName: string; // 通常は 'handleError'
    signature: string;    // 'handleError(ctx: Context, e: unknown)'
    importPath: string;   // 相対パス
}
```

### Context型の拡張
```typescript
// ユーザー定義のContext
interface UserContext {
    db: PrismaClient;
    logger: Logger;
    // ...
}

// 生成時にIpcMainInvokeEventを追加
interface GeneratedContext extends UserContext {
    event: IpcMainInvokeEvent;
}
```

### 生成されるコードのパターン
```typescript
// メインプロセス側の生成パターン（Context付きエラーハンドラー）
const generatedHandlerTemplate = `
ipcMain.handle('${functionName}', async (event: IpcMainInvokeEvent, args: any) => {
    try {
        const result = await ${functionName}({ ...ctx, event }, args);
        return success(result);
    } catch (e) {
        return handleError({ ...ctx, event }, e);
    }
});
`;
```

## 重要な設計変更点

### 1. バリデーションの完全委譲
- **変更前**: electron-flowが自動的にZodバリデーションを挿入
- **変更後**: ユーザーがハンドラー内で自分でバリデーションを実装
- **利点**:
  - safeParse、parseの選択が可能
  - カスタムバリデーションロジックの追加が容易
  - ログ出力のタイミングを制御可能
  - 条件付きバリデーションなど複雑な処理に対応

### 2. Context付きエラーハンドリングの導入
- **新機能**: `handleError(ctx: Context, e: unknown)` でContextを受け取る
- **変更後**: ユーザー定義のContext付きhandleError関数を呼び出し
- **利点**: 
  - エラー処理でもロガー、データベース、セッション管理などのサービスにアクセス可能
  - より詳細なエラーログの出力が可能（ユーザーID、セッションIDなど）
  - エラーに応じたビジネスロジックの実行が可能（セッションクリア、統計記録など）
  - アプリケーション固有のエラー型対応
  - テスタビリティの向上

### 3. 生成コードの簡素化
- 引数（args）をそのままハンドラーに渡す
- バリデーションとエラーハンドリングはユーザー実装に委ねる
- より予測可能で理解しやすいコード生成

### 4. 設定ファイルの拡張
```typescript
interface ElectronFlowConfig {
    // 既存設定...
    
    // エラーハンドラーの定義場所（必須）
    errorHandlerPath: string;
    
    // 監視対象にエラーハンドラーを追加
    dev: {
        watchPaths: [
            'src/main/handlers/**/*.ts',
            'src/main/error-handler.ts',  // 追加
            'electron-flow.config.ts',
        ];
    };
}
```

### 5. テンプレートの分離
- ハンドラー生成テンプレート
- Context付きエラーハンドラー統合テンプレート
- 型定義テンプレート

## 依存関係

### 実行時依存関係（dependencies）
- commander: CLIフレームワーク
- ts-morph: TypeScript AST操作
- chokidar: ファイル監視
- chalk: ターミナル出力の装飾
- ora: 進捗表示

### 開発時依存関係（devDependencies）
- typescript: TypeScriptコンパイラ
- @types/node: Node.js型定義
- **jest: テストフレームワーク（TDD対応）**
- **@types/jest: Jest型定義**
- **ts-jest: TypeScriptテスト実行環境**
- eslint: Linter
- prettier: フォーマッター
- **nodemon: テスト監視用**
- **@electron/rebuild: テスト環境でのElectron依存関係ビルド**

### ピア依存関係（peerDependencies）
- electron: Electronフレームワーク
- zod: スキーマバリデーション

## リリーススケジュール

1. **v0.1.0** - 基本機能のリリース
   - Result型パターンの実装
   - Context付きユーザー定義エラーハンドラーサポート
   - 基本的なコード生成
   - generateコマンド

2. **v0.2.0** - 開発体験の向上
   - watchコマンド
   - devコマンド
   - エラーレポートの改善

3. **v0.3.0** - 型推論の強化
   - 複雑な型の対応
   - より正確な型生成
   - パフォーマンス改善

4. **v1.0.0** - 安定版リリース
   - 完全なドキュメント
   - 本番環境での使用準備完了
   - 長期サポート（LTS）

## 成功指標

- npm週間ダウンロード数: 1,000+
- GitHub Stars: 500+
- アクティブなコントリビューター: 5+
- 平均イシュー解決時間: 7日以内
- **テストカバレッジ: 90%以上（TDD実装により）**
- **Context付きユーザー定義エラーハンドラーの使用率**: 95%以上
- **テスト実行時間: 10秒以内（CI/CDでの快適な実行）**
- **TDDサイクル時間: 5分以内（テスト→実装→リファクタリング）**

## 実装上の重要な考慮事項

### TDD実装戦略
- **Red-Green-Refactorサイクルの徹底**
  - まず失敗するテストを書く（Red）
  - 最小限のコードで成功させる（Green）
  - コードを改善する（Refactor）
- **テストファーストアプローチ**
  - 各機能実装前に期待する動作のテストを作成
  - テストが仕様書の役割を果たす
  - リファクタリング時の安全性確保
- **モック戦略**
  - Electronモジュールのモック
  - ファイルシステム操作のモック
  - ts-morphのAST操作のモック

### Context付きエラーハンドラーの検証
- エラーハンドラーファイルの存在確認
- 関数シグネチャの検証（Context, unknown パラメータ）
- Context型の互換性チェック
- エラーハンドラーのインポートパス解決

### 生成コードの品質
- Context の適切なスプレッド構文での渡し方
- IpcMainInvokeEvent の正確な注入
- 型安全性の維持
- エラーハンドリングの一貫性

### テスト品質の確保
- **テストの独立性**: 各テストが他のテストに依存しない
- **テストの網羅性**: 正常系・異常系・境界値をカバー
- **テストの可読性**: テスト名と内容でテストの意図が明確
- **テストの速度**: 開発サイクルを阻害しない実行時間

## TDD実装のベストプラクティス

### テスト構造
```typescript
// 例: パーサーのテスト構造
describe('HandlerParser', () => {
  describe('parseHandlerFunction', () => {
    it('should extract function name correctly', () => {
      // Arrange: テストデータの準備
      const sourceCode = `export async function getAuthor(ctx: Context, request: GetAuthorRequest) {}`;
      
      // Act: テスト対象の実行
      const result = parser.parseHandlerFunction(sourceCode);
      
      // Assert: 結果の検証
      expect(result.functionName).toBe('getAuthor');
    });
    
    it('should handle Context-only parameters', () => {
      const sourceCode = `export function getCurrentUser(ctx: Context) {}`;
      const result = parser.parseHandlerFunction(sourceCode);
      
      expect(result.parameters).toHaveLength(1);
      expect(result.parameters[0].name).toBe('ctx');
      expect(result.parameters[0].type).toBe('Context');
    });
  });
});
```

### モック設定例
```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};

// src/__tests__/setup.ts
import { jest } from '@jest/globals';

// Electronモジュールのモック
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

// ts-morphモジュールのモック
jest.mock('ts-morph', () => ({
  Project: jest.fn(),
  SyntaxKind: {
    FunctionDeclaration: 'FunctionDeclaration',
    Parameter: 'Parameter',
  },
}));
```

### テスト実行環境
```json
// package.json scripts section
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "tdd": "jest --watch --verbose"
  }
}
```

この実装計画により、TDDアプローチでContext付きエラーハンドリングを含む完全なelectron-flowライブラリを構築できます。テストファーストの開発により、高品質で保守性の高いコードベースを実現し、継続的な機能拡張と改善が可能な設計となっています。