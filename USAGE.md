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
npm install github:kuromiy/electron-flow#v5.0.0

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
| ----------- | ----- | ------ | ------ |
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

```text
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
    debug: true, // エラーハンドラーがエラーを投げた時にconsole.warn出力（省略可）
  },
});
```

エラーハンドラーは**生の値**を返します（`failure()`でラップ不要）：

```typescript
// src/error-handler.ts
import type { IpcMainInvokeEvent } from "electron";
import type { Context } from "./context";

type ErrorContext = Context & { event: IpcMainInvokeEvent };

export function handleError(
  error: unknown,
  ctx: ErrorContext
): { code: string; message: string } {
  // 生の値を返す（failure()でラップ不要）
  if (error instanceof ValidationError) {
    return { code: "VALIDATION_ERROR", message: error.message };
  }
  return { code: "UNKNOWN_ERROR", message: "An error occurred" };
}
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
    debug: true, // エラーハンドラーがエラーを投げた時にconsole.warn出力（省略可）
  },
});
```

個別エラーハンドラーも**生の値**または**null**を返します：

```typescript
// src/apis/user.ts
import type { IpcMainInvokeEvent } from "electron";
import type { Context } from "../context";

type ErrorContext = Context & { event: IpcMainInvokeEvent };

export function getUserErrorHandler(
  error: unknown,
  ctx: ErrorContext
): { code: "USER_NOT_FOUND" } | null {
  if (error instanceof UserNotFoundError) {
    return { code: "USER_NOT_FOUND" }; // 生の値を返す
  }
  return null; // nullを返すとグローバルエラーハンドラーにフォールバック
}
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

## UnknownError型

エラーハンドラーが処理できなかったエラー（またはエラーハンドラー自体がエラーを投げた場合）は`UnknownError`型でラップされます。

```typescript
import { isUnknownError, type UnknownError } from "electron-flow";

// renderer側での使用例
const result = await api.getUser({ id: "123" });
if (result._tag === "failure") {
  if (isUnknownError(result.error)) {
    console.error("未処理のエラー:", result.error.value);
  } else {
    // 型安全なエラーハンドリング
    console.error("エラーコード:", result.error.code);
  }
}
```

renderer側のエラー型は以下のルールで決定されます：

| エラーハンドラー設定 | エラー型 |
| --- | --- |
| なし | `UnknownError` |
| グローバルのみ | `GlobalErrorType \| UnknownError` |
| 個別のみ | `{FuncName}ErrorType \| UnknownError` |
| グローバル + 個別 | `{FuncName}ErrorType \| GlobalErrorType \| UnknownError` |
