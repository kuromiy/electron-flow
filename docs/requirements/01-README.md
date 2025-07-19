# electron-flow

TypeScript APIから自動でIPC通信コードを生成する、Electronアプリケーション開発用ビルドツールライブラリ

## 概要

electron-flowは、Electronアプリケーション開発の複雑なIPC通信を自動化し、型安全な開発環境を提供します。TypeScriptのAPI定義から必要なコードを自動生成し、開発者がビジネスロジックに集中できる環境を構築します。

## 主な機能

- 🚀 **自動コード生成** - TypeScript APIから型安全なIPC通信コードを自動生成

## クイックスタート

### 1. インストール

```bash
# GitHub からインストール
npm install github:your-org/electron-flow
```

### 2. プロジェクトの初期化

```bash
# 設定ファイルを生成
npx electron-flow init
```

これにより `electron-flow.config.ts` が生成されます：

```typescript
// electron-flow.config.ts
export const autoCodeOption: AutoCodeOption = {
    targetPath: "./src/main/api",
    ignores: [],
    preloadPath: "./src/preload/autogenerate/index.ts",
    registerPath: "./src/main/register/autogenerate/index.ts",
    rendererPath: "./src/renderer/autogenerate/index.d.ts",
};
```

### 3. コード生成

```bash
# IPC通信コードを生成
npx electron-flow gen
```

## 基本的な使い方

APIを定義すると、自動的にIPC通信コードが生成されます：

```typescript
// src/main/api/users.ts
export const createUserSchema = z.object({
    name: z.string(),
    email: z.string(),
});
export type CreateUserRequest = z.infer<typeof createUserSchema>;

export async function createUser(ctx: Context, request: CreateUserRequest) {
    // API実装省略
}
```

レンダラー側では型安全にAPIを呼び出せます：

```typescript
// src/renderer/components/UserForm.tsx
const result = await window.electronAPI.createUser("John", "john@example.com");
```

## ドキュメント

- **[API リファレンス](./API-REFERENCE.md)** - 詳細な技術仕様、設定オプション、実装例
- **[アーキテクチャ](./ARCHITECTURE.md)** - 設計思想、内部構造、拡張方法

## 必要な環境

- Node.js 22+
- TypeScript 5+

## ライセンス

MIT License