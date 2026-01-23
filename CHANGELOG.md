# Changelog

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
