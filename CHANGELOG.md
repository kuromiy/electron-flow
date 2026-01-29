# Changelog

## [4.0.0] - 2026-01-30

### Changed

- **BREAKING**: `targetDirPath`を`apiDirPath`に名前変更
- **BREAKING**: `preloadPath`をファイルパスからディレクトリパスに変更
  - `api.ts`が出力される（イベント使用時は`event.ts`も出力）
- **BREAKING**: `rendererPath`をファイルパスからディレクトリパスに変更
  - `api.ts`が出力される（イベント使用時は`event.ts`も出力）
- **BREAKING**: イベント関連の個別パス指定を削除し、各ディレクトリへの自動出力に統合
  - 削除: `preloadEventsPath`, `eventSenderPath`, `rendererEventsPath`
  - `registerPath`に`event-sender.ts`、`preloadPath`と`rendererPath`に`event.ts`が自動出力
- `ignores`オプションをオプショナルに変更（デフォルト: `[]`）

### Added

- `AutoCodeOption`型のエクスポート
- USAGE.mdドキュメント追加

## [3.1.0] - 2026-01-28

### Added

- 関数ごとの個別エラーハンドラー対応を追加
  - `errorHandlerConfig`オプションでエラーハンドラー名のパターンを指定可能
  - パターンは`{funcName}`（関数名そのまま）と`{FuncName}`（PascalCase）をサポート
  - 個別エラーハンドラーが`null`を返した場合、グローバルエラーハンドラーにフォールバック

## [3.0.0] - 2026-01-24

### Changed

- **BREAKING**: `registerPath`の出力を単一ファイルから`handlers.ts`と`api.ts`の2ファイルに分割
  - `registerPath`はファイルパスではなくディレクトリパスを指定するように変更
  - `handlers.ts`: IPCハンドラーの定義を含む
  - `api.ts`: `registerAutoGenerateAPI`と`removeAutoGenerateAPI`関数を含む

## [2.4.0] - 2026-01-16

### Added

- renderer生成時にカスタムエラーハンドラーの戻り値型を自動推論する機能

### Changed

- カスタムエラーハンドラー設定時、エラー型が`unknown`から推論された型に変更
