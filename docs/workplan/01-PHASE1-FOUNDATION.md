# Phase 1: プロジェクト基盤構築

## 1. フェーズ概要

### 目標
開発に必要な基盤となるプロジェクト構造、開発環境、ツールチェーンを確立し、後続フェーズでの効率的な開発を可能にする。

### 期間
**1週間** (5営業日)

### 主要成果物
- プロジェクト構造の確立
- TypeScript/Node.js開発環境
- 基本的な設定ファイル群
- 開発ツールの設定
- CI/CD基盤の構築

## 2. 詳細タスクリスト

### 2.1 プロジェクト構造作成 (Day 1)

#### タスク 1.1: ディレクトリ構造の構築
**所要時間**: 2時間

```
electron-flow/
├── packages/
│   └── codeGenerate/           # メインパッケージ
│       ├── src/
│       │   ├── parse.ts        # AST解析 (Phase 2で実装)
│       │   ├── zod.ts          # Zodスキーマ解析 (Phase 2で実装)
│       │   ├── format.ts       # コード生成 (Phase 3で実装)
│       │   ├── build.ts        # ビルド管理 (Phase 4で実装)
│       │   └── watch.ts        # ファイル監視 (Phase 6で実装)
│       ├── templates/          # コード生成テンプレート
│       └── package.json
├── cli/                        # CLI実装 (Phase 5で実装)
│   ├── src/
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   └── gen.ts
│   │   └── index.ts
│   └── package.json
├── examples/                   # サンプルプロジェクト
│   └── basic-electron-app/
├── docs/                       # 既存ドキュメント
│   ├── requirements/
│   ├── design/
│   └── workplan/
├── tools/                      # 開発支援ツール
├── scripts/                    # ビルドスクリプト
└── 設定ファイル群
```

**完了基準**: ディレクトリ構造が作成され、基本的なpackage.jsonが配置されている

#### タスク 1.2: ルートレベル設定ファイル作成
**所要時間**: 3時間

- **package.json** (workspace構成)
- **tsconfig.json** (TypeScript設定)
- **tsconfig.build.json** (ビルド用TypeScript設定)
- **.gitignore**
- **.npmignore**
- **README.md** (基本情報)
- **LICENSE** (MIT License)

**完了基準**: 基本的なTypeScriptビルドが実行可能

### 2.2 開発環境セットアップ (Day 2)

#### タスク 1.3: TypeScript環境構築
**所要時間**: 3時間

```json
// tsconfig.json 設定例
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**完了基準**: TypeScript strict modeでのビルドが通る

#### タスク 1.4: 依存関係の定義と安装
**所要時間**: 2時間

**主要依存関係**:
```json
{
  "dependencies": {
    "typescript": "^5.0.0",
    "zod": "^3.22.0",
    "chokidar": "^3.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "prettier": "^3.0.0"
  }
}
```

**完了基準**: すべての依存関係がインストールされ、ビルドエラーがない

### 2.3 開発ツール設定 (Day 3)

#### タスク 1.5: ESLint/Prettier設定
**所要時間**: 2時間

**.eslintrc.js**:
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn'
  }
};
```

**.prettierrc**:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

**完了基準**: コードフォーマットとリンティングが動作する


### 2.4 ビルドシステム構築 (Day 3-4)

#### タスク 1.7: ビルドスクリプトの作成
**所要時間**: 3時間

**package.json scripts**:
```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc --watch",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run clean && npm run build"
  }
}
```

**完了基準**: すべてのスクリプトが正常実行される

#### タスク 1.8: 基本的なファイル構造の作成
**所要時間**: 2時間

各モジュールの基本的なエクスポート構造を作成:

**packages/codeGenerate/src/index.ts**:
```typescript
// Phase 2以降で実装される関数のプレースホルダー
export async function build(option: any): Promise<any> {
  throw new Error('Not implemented yet');
}

export async function watchBuild(option: any): Promise<void> {
  throw new Error('Not implemented yet');
}
```

**完了基準**: ビルドが通り、基本的なエクスポートが可能

### 2.5 CI/CD基盤構築 (Day 4-5)

#### タスク 1.9: GitHub Actions設定
**所要時間**: 3時間

**.github/workflows/ci.yml**:
```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20, 22]
    
    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm ci
    - run: npm run lint
    - run: npm run build
```

**完了基準**: GitHub ActionsでCIが実行される

#### タスク 1.10: 基本ドキュメント作成
**所要時間**: 2時間

- **README.md更新** (インストール方法、基本使用法)
- **CONTRIBUTING.md** (開発者向けガイド)
- **CHANGELOG.md** (変更履歴管理)

**完了基準**: 第三者が開発に参加できる情報が揃っている

## 3. 技術要件

### 3.1 必要なツール・ライブラリ
- **Node.js**: 22.x以上
- **TypeScript**: 5.x以上
- **ESLint + Prettier**: コード品質管理
- **Zod**: スキーマバリデーション（Phase 2で使用）
- **Chokidar**: ファイル監視（Phase 6で使用）

### 3.2 開発環境要件
- **OS**: Windows/macOS/Linux対応
- **IDE**: VS Code推奨（設定ファイル含む）
- **Git**: バージョン管理
- **npm/yarn**: パッケージ管理

## 4. 品質基準

### 4.1 コード品質
- TypeScript strict mode有効
- ESLintルール100%準拠
- Prettierフォーマット適用済み
- 型定義の完全性

### 4.2 ビルド品質
- ビルドプロセスが正常動作
- ESLint/Prettierが正常動作
- CI/CDでの自動ビルド実行

### 4.3 ドキュメント品質
- 開発者向けガイドが完備
- セットアップ手順が明確
- 各ツールの使用方法が記載

## 5. リスク管理

### 5.1 技術的リスク
**リスク**: TypeScript設定の複雑化
- **対策**: 段階的な設定適用、最小限の設定から開始
- **検出**: ビルドエラーの監視

**リスク**: 依存関係の競合
- **対策**: package-lock.jsonの活用、定期的な依存関係更新
- **検出**: npm auditの定期実行

### 5.2 スケジュールリスク
**リスク**: 環境構築の遅延
- **対策**: Docker環境の準備（代替案）
- **検出**: 日次進捗確認

## 6. 完了基準

### 6.1 必須基準
- [ ] TypeScriptビルドが成功する
- [ ] ESLint/Prettierが動作する
- [ ] CI/CDが動作する
- [ ] 基本的なプロジェクト構造が完成

### 6.2 推奨基準
- [ ] VS Code設定が完備
- [ ] 開発者ドキュメントが充実
- [ ] セットアップが10分以内で完了
- [ ] 複数Node.jsバージョンでのビルド通過

## 7. 次フェーズへの引き継ぎ

### 7.1 Phase 2準備
- TypeScript Compiler APIの調査開始
- AST解析の技術検証準備
- Zodスキーマ解析のプロトタイプ検討

### 7.2 チェックポイント
1. **環境確認**: 開発環境が全チームメンバーで動作
2. **ビルド確認**: 継続的なビルド成功
3. **ドキュメント確認**: セットアップガイドの有効性検証

### 7.3 移行判定基準
- すべての完了基準をクリア
- 次フェーズの技術調査が開始可能
- チーム全体での環境統一完了