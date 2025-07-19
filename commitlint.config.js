module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新機能
        'fix',      // バグ修正
        'docs',     // ドキュメント
        'style',    // フォーマット（コードの動作に影響しない変更）
        'refactor', // リファクタリング
        'perf',     // パフォーマンス改善
        'test',     // テスト
        'build',    // ビルドシステムや外部依存関係の変更
        'ci',       // CI設定ファイルの変更
        'chore',    // その他の変更（ソースやテストの変更を含まない）
        'revert'    // 以前のコミットを取り消す
      ]
    ],
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case']
    ],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'body-max-line-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 100]
  }
};