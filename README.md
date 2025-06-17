# electron-flow

Electronアプリケーション用の型安全なIPCコードジェネレーター。Resultタイプパターンとユーザー定義エラーハンドリングを提供します。

## 特徴

- 🔒 **型安全なIPC通信** - 自動型推論による完全なTypeScriptサポート
- 🎯 **Resultタイプパターン** - 例外を使わない明示的なエラーハンドリング
- 🛠️ **ユーザー定義バリデーション** - Zodを使用したリクエストバリデーションの完全な制御
- 🎨 **コンテキスト対応エラーハンドリング** - エラーハンドラー内でロガー、データベース、サービスへのアクセス
- 🚀 **開発者フレンドリー** - ホットリロード、自動再生成、明確なエラーメッセージ
- 📦 **ゼロ設定** - 柔軟なカスタマイズオプションを持つ合理的なデフォルト設定

## インストール

GitHubから直接インストール:

```bash
npm install --save-dev github:yourusername/electron-flow
# または
yarn add -D github:yourusername/electron-flow
# または
pnpm add -D github:yourusername/electron-flow
```

特定のバージョンやブランチを指定する場合:

```bash
# タグを指定
npm install --save-dev github:yourusername/electron-flow#v0.1.0

# ブランチを指定
npm install --save-dev github:yourusername/electron-flow#main

# コミットハッシュを指定
npm install --save-dev github:yourusername/electron-flow#3c0f744
```

## クイックスタート

1. プロジェクトを初期化:

```bash
npx electron-flow init
```

2. ハンドラーを定義:

```typescript
// src/main/handlers/author.ts
import { z } from 'zod';
import type { Context } from '../context';

export const getAuthorSchema = z.object({
  id: z.string(),
});

export type GetAuthorRequest = z.infer<typeof getAuthorSchema>;

export async function getAuthor(ctx: Context, request: GetAuthorRequest) {
  // リクエストをバリデート
  const valid = getAuthorSchema.safeParse(request);
  if (!valid.success) {
    throw new ValidError(valid.error);
  }
  
  // ビジネスロジック
  const author = await ctx.db.author.findUnique({
    where: { id: valid.data.id }
  });
  
  if (!author) {
    throw new ApplicationError('著者が見つかりません');
  }
  
  return author;
}
```

3. エラーハンドラーを定義:

```typescript
// src/main/error-handler.ts
import { failure } from 'electron-flow/runtime';
import type { Context } from './context';

export function handleError(ctx: Context, e: unknown) {
  if (e instanceof ValidError) {
    const errors = toErrorValue(e.errors);
    return failure(errors);
  }
  
  if (e instanceof ApplicationError) {
    return failure([{ 
      path: "アプリケーションエラー", 
      messages: [e.message] 
    }]);
  }
  
  return failure([{ 
    path: "システムエラー", 
    messages: [e.message] 
  }]);
}
```

4. IPCコードを生成:

```bash
npx electron-flow generate
```

5. レンダラーで使用:

```typescript
import { api } from './generated/renderer/api';

const author = await api.author.get({ id: '123' });
console.log(author.name);
```

## 設定

プロジェクトルートに`electron-flow.config.ts`を作成:

```typescript
import type { ElectronFlowConfig } from 'electron-flow';

const config: ElectronFlowConfig = {
  handlersDir: 'src/main/handlers',
  outDir: 'src/generated',
  contextPath: 'src/main/context.ts',
  errorHandlerPath: 'src/main/error-handler.ts',
  dev: {
    electronEntry: 'src/main/index.ts',
    preloadEntry: 'src/preload/index.ts',
    viteConfig: 'vite.config.ts',
  },
};

export default config;
```

## コマンド

- `npx electron-flow init` - 新しいプロジェクトを初期化
- `npx electron-flow generate` - IPCコードを生成
- `npx electron-flow watch` - 変更を監視して再生成
- `npx electron-flow dev` - ホットリロード付き開発サーバー

## ドキュメント

詳細なドキュメントについては、[https://github.com/yourusername/electron-flow](https://github.com/yourusername/electron-flow)をご覧ください。

## ライセンス

MIT