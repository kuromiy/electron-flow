# electron-flow 使い方ガイド

## 概要

electron-flowは、ElectronアプリケーションのIPC通信コードを自動生成するツールです。
API定義ファイルから、preload・main・rendererの各層で必要なコードを型安全に生成します。

## インストール

```bash
npm install github:kuromiy/electron-flow
```

特定のバージョンやブランチを指定する場合：

```bash
# タグ指定
npm install github:kuromiy/electron-flow#v4.0.0

# ブランチ指定
npm install github:kuromiy/electron-flow#main
```

## 基本的な使い方

### 1. API定義ファイルを作成

```typescript
// src/apis/user.ts
import type { Context } from "../context";

export async function getUser(
  ctx: Context,
  args: { id: string }
): Promise<{ name: string; email: string }> {
  // 実装
  return { name: "John", email: "john@example.com" };
}
```

### 2. ビルドスクリプトを作成

```typescript
// scripts/generate.ts
import { build } from "electron-flow";

await build({
  apiDirPath: "./src/apis",
  contextPath: "./src/context.ts",
  preloadPath: "./src/generated/preload",
  registerPath: "./src/generated/register",
  rendererPath: "./src/generated/renderer",
});
```

### 3. 実行

```bash
npx tsx scripts/generate.ts
```

## AutoCodeOption

| プロパティ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `apiDirPath` | `string` | ✓ | API定義ファイルのディレクトリパス |
| `contextPath` | `string` | ✓ | Contextファイルのパス |
| `preloadPath` | `string` | ✓ | preload用コード出力ディレクトリ |
| `registerPath` | `string` | ✓ | main用コード出力ディレクトリ |
| `rendererPath` | `string` | ✓ | renderer用コード出力ディレクトリ |
| `ignores` | `string[]` | | 除外するファイルパターン |
| `eventDirPath` | `string` | | イベント定義ディレクトリ |
| `unwrapResults` | `boolean` | | Result型をアンラップするか（デフォルト: false） |
| `customErrorHandler` | `object` | | カスタムエラーハンドラー設定 |
| `validatorConfig` | `object` | | バリデーター設定 |
| `errorHandlerConfig` | `object` | | 個別エラーハンドラー設定 |

## 出力ファイル構造

```
preloadPath/
├── api.ts          # IPC exposeAll
└── event.ts        # イベントリスナー（eventDirPath指定時）

registerPath/
├── handlers.ts     # IPCハンドラー登録
├── api.ts          # API関数のインポート
└── event-sender.ts # イベント送信（eventDirPath指定時）

rendererPath/
├── api.ts          # renderer用API
└── event.ts        # イベント購読（eventDirPath指定時）
```

## イベント機能

main→renderer方向のイベント通知を定義できます。

### イベント定義

```typescript
// src/events/notification.ts
export type NotificationEvent = {
  title: string;
  message: string;
};
```

### 設定

```typescript
await build({
  // ...基本設定
  eventDirPath: "./src/events",
});
```

### 使用例

```typescript
// main側（送信）
import { sendNotificationEvent } from "./generated/register/event-sender";
sendNotificationEvent(win, { title: "Hello", message: "World" });

// renderer側（受信）
import { useNotificationEvent } from "./generated/renderer/event";
useNotificationEvent((data) => {
  console.log(data.title, data.message);
});
```

## Watch機能

ファイル変更を監視して自動再生成します。

```typescript
import { watchBuild } from "electron-flow";

await watchBuild({
  apiDirPath: "./src/apis",
  // ...その他のオプション
});
```

## オプション詳細

### カスタムエラーハンドラー

```typescript
await build({
  // ...
  customErrorHandler: {
    path: "./src/error-handler.ts",
    functionName: "handleError",
  },
});
```

### バリデーター設定

```typescript
await build({
  // ...
  validatorConfig: {
    pattern: "validate{FuncName}",  // validateGetUser のような関数を検出
  },
});
```

### 個別エラーハンドラー設定

```typescript
await build({
  // ...
  errorHandlerConfig: {
    pattern: "{funcName}ErrorHandler",  // getUserErrorHandler のような関数を検出
  },
});
```

## Result型

electron-flowは`Result<T, E>`型を提供し、エラーハンドリングを型安全に行えます。

```typescript
import { ok, err, type Result } from "electron-flow";

export async function getUser(
  ctx: Context,
  args: { id: string }
): Promise<Result<User, "NOT_FOUND" | "DB_ERROR">> {
  const user = await db.findUser(args.id);
  if (!user) {
    return err("NOT_FOUND");
  }
  return ok(user);
}
```

`unwrapResults: true`を指定すると、Result型を自動でアンラップし、エラー時は例外をスローするAPIに変換されます。
