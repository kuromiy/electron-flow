# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-06-20

### Fixed
- **設定ファイルテンプレートの型定義不整合を修正**
  - `npx electron-flow init`で生成される設定ファイルテンプレートが実際の`ElectronFlowConfig`型定義と異なっていた問題を修正
  - `dev`セクション: 不正な`enabled`, `port`プロパティを削除し、正しい`electronEntry`, `preloadEntry`, `viteConfig`, `watchPaths`に変更
  - `generation`セクション: 不正な`useStrict`, `emitComments`プロパティを削除し、正しい`apiStructure`, `prettier`, `prettierConfig`に変更
  - この修正により、初期化後の設定ファイルでTypeScriptの型エラーが発生することを防止

### Improved
- **テストの安定性向上**
  - `src/cli/commands/__tests__/dev.test.ts`のモック処理とクリーンアップ処理を改善
  - タイムアウト処理を最適化し、テストの実行安定性を向上

### Changed
- **開発ドキュメントの大幅な改善**
  - `CLAUDE.md`を全面的に更新（301行追加、134行削除）
  - プロジェクトガイドライン、アーキテクチャ詳細、開発ワークフローを詳細化
  - TDD開発プロセス、デバッグ手順、パフォーマンス最適化のガイダンスを追加
  - 具体的なコード例とテンプレートパターンを大幅に拡充

## [0.1.0] - 2025-06-20

### Added
- **初回リリース**
  - Electronアプリケーション用の型安全なIPCコードジェネレーター
  - Resultタイプパターンによる明示的なエラーハンドリング
  - ユーザー定義バリデーションとコンテキスト対応エラーハンドリング
  - 4つのCLIコマンド: `init`, `generate`, `watch`, `dev`
  - TypeScript AST解析による自動型推論
  - main/preload/renderer用のコード自動生成
  - ホットリロード対応の開発サーバー
  - 包括的なテストスイート（138テスト、85.27%カバレッジ）

### Dependencies
- **ランタイム依存関係**: chalk (^5.3.0), chokidar (^3.5.3), commander (^11.1.0), lodash (^4.17.21), ora (^8.0.1), ts-morph (^21.0.1)
- **ピア依存関係**: electron (>=13.0.0), zod (>=3.0.0)
- **Node.js要件**: >=16.0.0

[0.1.1]: https://github.com/yourusername/electron-flow/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/yourusername/electron-flow/releases/tag/v0.1.0