# misc - デバッグ・テスト用ファイル

このフォルダには、開発中に作成されたデバッグ・動作確認用のファイルが含まれています。

## ファイル一覧

### テストデータ
- `test-sample.ts` - TypeScript関数とZodスキーマのサンプルファイル

### 統合テスト
- `test-validation.ts` - Phase 2の統合検証スクリプト（メイン）
- `public-api-test.ts` - パブリックAPI動作確認テスト

### デバッグスクリプト
- `direct-test.ts` - 直接メソッド呼び出しテスト
- `ast-debug.ts` - AST解析の詳細デバッグ
- `debug-test.ts` - 簡単なデバッグテスト
- `simple-test.ts` - 基本的な動作確認
- `minimal-test.ts` - 最小限のテスト（問題特定用）

## 使用方法

```bash
# メインの統合検証を実行
npx tsx misc/test-validation.ts

# 個別のデバッグスクリプトを実行
npx tsx misc/direct-test.ts
npx tsx misc/ast-debug.ts

# パブリックAPI動作確認
npx tsx misc/public-api-test.ts
```

## 注意事項

- これらのファイルは開発・デバッグ用途であり、本番環境では使用されません
- コアライブラリには含まれません（package.jsonのfilesから除外済み）
- TypeScript Compiler APIの動作確認や問題の切り分けに使用します

## 主な検証内容

1. **TypeScript AST解析**
   - 関数宣言の検出
   - パラメータと型情報の抽出
   - インポート/エクスポート解析

2. **Zodスキーマ解析**
   - z.object()パターンの検出
   - フィールド型とバリデーション情報の抽出

3. **統合機能**
   - パブリックAPIの動作確認
   - エラーハンドリングの検証
   - パフォーマンスの確認