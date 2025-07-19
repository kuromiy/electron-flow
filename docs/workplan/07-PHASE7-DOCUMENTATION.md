# Phase 7: ドキュメンテーション

## 1. フェーズ概要

### 目標
electron-flowを第三者が効果的に使用できるよう、包括的で分かりやすいドキュメンテーションを作成する。ユーザーガイド、APIドキュメント、サンプルプロジェクト、トラブルシューティングガイドを通じて、優れたユーザーエクスペリエンスを提供する。

### 期間
**1週間** (5営業日)

### 主要成果物
- ユーザー向けドキュメント
- 開発者向けAPIドキュメント
- サンプルプロジェクト
- トラブルシューティングガイド
- コントリビューションガイド

## 2. 詳細タスクリスト

### タスク 7.1: ユーザードキュメント作成 (Day 1-2)
**所要時間**: 12時間

#### ユーザーガイドの構成
```markdown
# electron-flow ユーザーガイド

## クイックスタート
### インストール
### プロジェクトのセットアップ
### 基本的な使い方

## 基本概念
### TypeScript API の定義方法
### Zodスキーマの使用
### 生成されるコードの理解

## 設定ガイド
### electron-flow.config.ts の詳細
### カスタムエラーハンドリング
### 高度な設定オプション

## ベストプラクティス
### API設計のガイドライン
### パフォーマンス最適化
### セキュリティ考慮事項

## 移行ガイド
### 既存プロジェクトへの導入
### 段階的移行戦略
### よくある課題と解決方法
```

**クイックスタートガイド**:
```markdown
# クイックスタート

## 1. インストール

```bash
# GitHubから直接インストール
npm install -g github:your-org/electron-flow

# または、HTTPS URLを使用
npm install -g git+https://github.com/your-org/electron-flow.git

# 特定のバージョンをインストールする場合
npm install -g github:your-org/electron-flow#v1.0.0
```

## 2. プロジェクト初期化

```bash
# Electronプロジェクトのルートディレクトリで実行
npx electron-flow init
```

このコマンドにより以下のファイルが生成されます：
- `electron-flow.config.ts` - 設定ファイル
- `src/types/context.ts` - Context型定義

## 3. API関数の作成

`src/main/api/users.ts` ファイルを作成：

```typescript
import { z } from 'zod';
import { Context } from '../../types/context';

// Zodスキーマの定義
export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(120).optional()
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;

// API関数の実装
export async function createUser(
  ctx: Context,
  request: CreateUserRequest
): Promise<User> {
  // 実装をここに記述
  return {
    id: Date.now().toString(),
    ...request,
    createdAt: new Date()
  };
}

export async function getUsers(ctx: Context): Promise<User[]> {
  // 実装をここに記述
  return [];
}
```

## 4. コード生成

```bash
npx electron-flow gen
```

これにより以下のファイルが自動生成されます：
- `src/preload/autogenerate/index.ts` - プリロードスクリプト
- `src/main/register/autogenerate/index.ts` - IPCハンドラー
- `src/renderer/autogenerate/index.d.ts` - 型定義

## 5. Electronアプリでの使用

### メインプロセス
```typescript
import { autoGenerateHandlers } from './register/autogenerate';

// Context オブジェクトの作成
const baseContext = {
  // アプリケーション固有のコンテキスト
};

// IPCハンドラーの登録
Object.entries(autoGenerateHandlers).forEach(([channel, handler]) => {
  ipcMain.handle(channel, handler(baseContext));
});
```

### レンダラープロセス
```typescript
// 型安全なAPI呼び出し
const result = await window.electronAPI.createUser({
  name: "John Doe",
  email: "john@example.com",
  age: 30
});

if (result.success) {
  console.log("User created:", result.data);
} else {
  console.error("Error:", result.error.message);
}
```
```

**完了基準**: 初心者が30分以内にelectron-flowを使い始められるドキュメントが作成される

### タスク 7.2: APIリファレンス作成 (Day 2-3)
**所要時間**: 12時間

**APIドキュメント自動生成**:
```typescript
// TypeDocを使用したAPI ドキュメント生成
{
  "scripts": {
    "docs:api": "typedoc --out docs/api src/index.ts",
    "docs:generate": "node scripts/generate-docs.js"
  }
}
```

**設定リファレンス**:
```markdown
# 設定リファレンス

## AutoCodeOption

### 必須フィールド

#### targetPath
- **型**: `string`
- **説明**: APIファイルが配置されているディレクトリのパス
- **例**: `"./src/main/api"`

#### preloadPath
- **型**: `string`
- **説明**: プリロードスクリプトの生成先パス
- **例**: `"./src/preload/autogenerate/index.ts"`

#### registerPath
- **型**: `string`
- **説明**: IPCハンドラーの生成先パス
- **例**: `"./src/main/register/autogenerate/index.ts"`

#### rendererPath
- **型**: `string`
- **説明**: レンダラー用型定義の生成先パス
- **例**: `"./src/renderer/autogenerate/index.d.ts"`

### オプションフィールド

#### contextPath
- **型**: `string | undefined`
- **説明**: Context型定義ファイルのパス
- **デフォルト**: `"./src/types/context.ts"`

#### errorHandler
- **型**: `ErrorHandlerConfig | undefined`
- **説明**: カスタムエラーハンドラーの設定

```typescript
interface ErrorHandlerConfig {
  handlerPath: string;    // エラーハンドラー関数のパス
  handlerName: string;    // 関数名
  defaultHandler?: boolean; // デフォルトハンドラーの併用
}
```

#### advanced
- **型**: `AdvancedOptions | undefined`
- **説明**: 高度な設定オプション
```

**完了基準**: すべてのAPI、設定オプション、型定義が詳細に文書化される

### タスク 7.3: サンプルプロジェクト作成 (Day 3-4)
**所要時間**: 12時間

**サンプルプロジェクト構成**:
```
examples/
├── basic-todo-app/           # 基本的なTodoアプリ
│   ├── README.md
│   ├── package.json
│   ├── src/
│   │   ├── main/
│   │   │   ├── api/
│   │   │   │   ├── todos.ts
│   │   │   │   └── categories.ts
│   │   │   └── main.ts
│   │   ├── preload/
│   │   ├── renderer/
│   │   └── types/
│   └── electron-flow.config.ts
├── advanced-chat-app/        # 高度なチャットアプリ
└── migration-example/        # 既存プロジェクトの移行例
```

**基本Todoアプリサンプル**:
```typescript
// examples/basic-todo-app/src/main/api/todos.ts
import { z } from 'zod';
import { Context } from '../types/context';

export const todoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.date().optional()
});

export type CreateTodoRequest = z.infer<typeof todoSchema>;

export interface Todo extends CreateTodoRequest {
  id: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function createTodo(
  ctx: Context,
  request: CreateTodoRequest
): Promise<Todo> {
  const todo: Todo = {
    id: Date.now().toString(),
    ...request,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // データベース保存の実装
  await ctx.db.todos.create(todo);
  
  return todo;
}

export async function getTodos(ctx: Context): Promise<Todo[]> {
  return await ctx.db.todos.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function updateTodo(
  ctx: Context,
  id: string,
  updates: Partial<CreateTodoRequest>
): Promise<Todo> {
  const todo = await ctx.db.todos.update({
    where: { id },
    data: { ...updates, updatedAt: new Date() }
  });
  
  return todo;
}

export async function deleteTodo(
  ctx: Context,
  id: string
): Promise<void> {
  await ctx.db.todos.delete({ where: { id } });
}
```

**サンプルの README**:
```markdown
# Basic Todo App - electron-flow サンプル

このサンプルは、electron-flowを使用した基本的なTodoアプリケーションです。

## 特徴

- ✅ CRUD操作の実装
- ✅ Zodバリデーション
- ✅ 型安全なIPC通信
- ✅ エラーハンドリング
- ✅ データベース連携

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. データベースのセットアップ
```bash
npm run db:setup
```

3. アプリケーションの起動
```bash
npm start
```

## 学習ポイント

### 1. API設計
`src/main/api/todos.ts` でTodo操作のAPIを定義しています。

### 2. Zodスキーマ
`todoSchema` でリクエストのバリデーションを定義しています。

### 3. Context の活用
データベース接続などの共通リソースをContextで管理しています。
```

**完了基準**: 3つの異なる複雑さレベルのサンプルプロジェクトが動作し、詳細な説明が含まれる

### タスク 7.4: トラブルシューティングガイド (Day 4)
**所要時間**: 6時間

**よくある問題と解決方法**:
```markdown
# トラブルシューティングガイド

## よくある問題

### 1. 「設定ファイルが見つかりません」エラー

**症状**:
```
Error: Configuration file not found: ./electron-flow.config.ts
```

**原因**:
- 設定ファイルが存在しない
- ファイル名が間違っている
- 実行ディレクトリが間違っている

**解決方法**:
1. プロジェクトルートで `npx electron-flow init` を実行
2. 設定ファイルのパスを確認
3. `--config` オプションで明示的にパスを指定

### 2. 「型定義が見つかりません」エラー

**症状**:
```
TS2304: Cannot find name 'CreateUserRequest'
```

**原因**:
- Zodスキーマのエクスポートが正しくない
- 型推論の記述が間違っている

**解決方法**:
```typescript
// 正しい書き方
export const userSchema = z.object({...});
export type CreateUserRequest = z.infer<typeof userSchema>;

// 間違った書き方
const userSchema = z.object({...}); // exportが抜けている
```

### 3. 生成されたコードでエラーが発生

**症状**:
- TypeScriptコンパイルエラー
- ランタイムエラー

**原因と解決方法**:

#### インポートパスの問題
```typescript
// 設定ファイルでの相対パス確認
export const autoCodeOption: AutoCodeOption = {
  targetPath: "./src/main/api",     // 正しいパス
  contextPath: "./src/types/context.ts"
};
```

#### Context型の不一致
```typescript
// Context型の定義確認
export interface Context {
  event: IpcMainInvokeEvent;
  // 追加のプロパティ
  db: DatabaseConnection;
  user?: AuthenticatedUser;
}
```

### 4. パフォーマンスの問題

**症状**:
- ビルドが遅い
- メモリ使用量が多い

**解決方法**:
1. `ignores` 設定でファイルを除外
2. キャッシュの確認
3. ファイル分割の検討

```typescript
export const autoCodeOption: AutoCodeOption = {
  // ...
  ignores: [
    "**/*.spec.ts",
    "**/node_modules/**"
  ]
};
```

## デバッグ方法

### 1. 詳細ログの有効化
```bash
npx electron-flow gen --verbose --debug
```

### 2. 生成されたコードの確認
```bash
npx electron-flow gen --dry-run
```

### 3. 設定の検証
```bash
npx electron-flow init --force
```
```

**完了基準**: 主要なエラーケースと解決方法が網羅され、検索しやすく整理される

### タスク 7.5: コントリビューションガイドとリリース準備 (Day 5)
**所要時間**: 6時間

**開発者向けドキュメント**:
```markdown
# Contributing to electron-flow

## 開発環境のセットアップ

### 前提条件
- Node.js 22.x以上
- npm 10.x以上
- Git

### セットアップ手順

1. リポジトリのクローン
```bash
git clone https://github.com/your-org/electron-flow.git
cd electron-flow
```

2. 依存関係のインストール
```bash
npm install
```

3. ビルドの実行
```bash
npm run build
```

## 開発ワークフロー

### ブランチ戦略
- `main`: 安定版
- `develop`: 開発版
- `feature/*`: 新機能
- `bugfix/*`: バグ修正

### コミット規約
Conventional Commits形式を採用:

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメントの更新
style: コードフォーマットの変更
refactor: リファクタリング
chore: ビルドプロセスやツールの変更
```

### コードスタイル
- ESLint + Prettier
- TypeScript strict mode

## リリースプロセス

### 1. バージョン管理
semver (semantic versioning) に従う:
- MAJOR: 破壊的変更
- MINOR: 後方互換性のある新機能
- PATCH: 後方互換性のあるバグ修正

### 2. リリース手順
```bash
# バージョンアップ
npm version patch|minor|major

# チェンジログ更新
npm run changelog

# ビルドとパッケージング
npm run build
npm run package

# 動作確認
npm run test

# GitHubリリースの作成
git push origin main --tags

# GitHubで新しいリリースを作成
# 1. https://github.com/your-org/electron-flow/releases
# 2. "Create a new release" をクリック
# 3. タグを選択し、リリースノートを記入
# 4. ビルドされたパッケージを添付（オプション）
```
```

**最終ドキュメント構成**:
```
docs/
├── user-guide/
│   ├── quickstart.md
│   ├── configuration.md
│   ├── best-practices.md
│   └── migration.md
├── api-reference/
│   ├── cli.md
│   ├── config.md
│   └── types.md
├── examples/
│   ├── basic-todo-app/
│   ├── advanced-chat-app/
│   └── migration-example/
├── troubleshooting/
│   ├── common-issues.md
│   └── debugging.md
└── contributing/
    ├── development.md
    └── release.md
```

**完了基準**: 包括的なドキュメントが整備され、第三者がelectron-flowを効果的に使用・貢献できる

## 3. 品質基準

### 3.1 ドキュメント品質
- **明確性**: 技術的でない読者にも理解可能
- **完全性**: すべての機能と設定オプションを網羅
- **正確性**: コードサンプルが実際に動作する
- **保守性**: バージョンアップに追従可能な構造

### 3.2 ユーザビリティ
- **検索性**: 必要な情報を素早く見つけられる
- **段階的学習**: 基礎から応用まで順序立てて学習可能
- **実用性**: 実際のプロジェクトで活用できる

## 4. 完了基準

### 4.1 必須基準
- [ ] クイックスタートガイドで30分以内に使用開始可能
- [ ] 全API・設定オプションが文書化されている
- [ ] 3つのサンプルプロジェクトが動作する
- [ ] 主要なトラブルシューティングガイドが完備
- [ ] コントリビューションガイドが整備されている

### 4.2 推奨基準
- [ ] 検索機能付きのWebサイト
- [ ] インタラクティブなチュートリアル
- [ ] 動画による解説

## 5. プロジェクト完了

### 5.1 最終確認項目
- [ ] すべてのフェーズの完了基準達成
- [ ] パフォーマンス要件の充足
- [ ] ドキュメントの完全性
- [ ] 実際のプロジェクトでの動作確認

### 5.2 リリース準備
- **パッケージング**: GitHubリリース用パッケージの作成
- **CI/CD**: 継続的インテグレーション・デプロイメント
- **セキュリティ**: 脆弱性スキャンと対策
- **ライセンス**: MITライセンスの適用

### 5.3 今後のメンテナンス計画
- **バグ報告**: GitHub Issuesでの対応
- **機能要望**: ロードマップの策定
- **セキュリティ更新**: 定期的な依存関係更新
- **コミュニティ**: 貢献者の受け入れ体制