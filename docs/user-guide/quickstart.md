# クイックスタート

electron-flowを使って、30分以内にElectronアプリケーションで型安全なIPC通信を実現する方法を説明します。

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

// User型の定義
export interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
  createdAt: Date;
}

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

export async function updateUser(
  ctx: Context,
  id: string,
  updates: Partial<CreateUserRequest>
): Promise<User> {
  // 実装をここに記述
  return {
    id,
    name: updates.name || 'Unknown',
    email: updates.email || 'unknown@example.com',
    age: updates.age,
    createdAt: new Date()
  };
}

export async function deleteUser(
  ctx: Context,
  id: string
): Promise<void> {
  // 実装をここに記述
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
// src/main/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoGenerateHandlers } from './register/autogenerate';

// Context オブジェクトの作成
const createBaseContext = (event: Electron.IpcMainInvokeEvent) => ({
  event,
  // アプリケーション固有のコンテキスト
  logger: console, // 実際のロガーに置き換え
  db: {}, // データベース接続
});

// IPCハンドラーの登録
Object.entries(autoGenerateHandlers).forEach(([channel, handler]) => {
  ipcMain.handle(channel, async (event, ...args) => {
    const context = createBaseContext(event);
    return handler(context)(...args);
  });
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/autogenerate/index.js')
    }
  });

  mainWindow.loadFile('dist/renderer/index.html');
}

app.whenReady().then(createWindow);
```

### プリロードスクリプト

生成されたプリロードスクリプトが自動的に `window.electronAPI` を設定します：

```typescript
// 自動生成されるプリロードスクリプト（確認用）
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  createUser: (request) => ipcRenderer.invoke('api:createUser', request),
  getUsers: () => ipcRenderer.invoke('api:getUsers'),
  updateUser: (id, updates) => ipcRenderer.invoke('api:updateUser', id, updates),
  deleteUser: (id) => ipcRenderer.invoke('api:deleteUser', id),
});
```

### レンダラープロセス

```typescript
// src/renderer/components/UserForm.tsx
async function createNewUser() {
  try {
    // 型安全なAPI呼び出し
    const result = await window.electronAPI.createUser({
      name: "John Doe",
      email: "john@example.com",
      age: 30
    });

    if (result.success) {
      console.log("User created:", result.data);
      return result.data;
    } else {
      console.error("Error:", result.error.message);
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error("Failed to create user:", error);
  }
}

async function loadUsers() {
  try {
    const result = await window.electronAPI.getUsers();
    
    if (result.success) {
      console.log("Users loaded:", result.data);
      return result.data;
    } else {
      console.error("Error loading users:", result.error.message);
      return [];
    }
  } catch (error) {
    console.error("Failed to load users:", error);
    return [];
  }
}
```

## 6. 開発ワークフロー

### ファイル監視モード

開発中は、ファイル変更を監視して自動的にコード生成を行えます：

```bash
npx electron-flow gen --watch
```

### デバッグ

詳細なログを確認したい場合：

```bash
npx electron-flow gen --verbose
```

実際にファイルを生成せずに確認したい場合：

```bash
npx electron-flow gen --dry-run
```

## 7. よく使用される設定

### カスタム Context

`src/types/context.ts` を編集してアプリケーション固有のContextを定義：

```typescript
import { IpcMainInvokeEvent } from 'electron';

export interface Context {
  event: IpcMainInvokeEvent;
  
  // カスタムプロパティ
  user?: {
    id: string;
    email: string;
    role: string;
  };
  
  logger: {
    info: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
  
  db: {
    users: any; // 実際のデータベースインターフェース
  };
}
```

### エラーハンドリング

electron-flowは自動的にZodバリデーションエラーとランタイムエラーをキャッチし、統一されたエラーレスポンスを返します：

```typescript
// エラーレスポンスの型
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    type: 'VALIDATION_ERROR' | 'RUNTIME_ERROR';
    details?: any;
  };
}

// 成功レスポンスの型
interface SuccessResponse<T> {
  success: true;
  data: T;
}

type APIResponse<T> = SuccessResponse<T> | ErrorResponse;
```

## 次のステップ

- [基本概念](./configuration.md) - 詳細な設定オプションと概念
- [ベストプラクティス](./best-practices.md) - 効果的な使用方法
- [API リファレンス](../api-reference/cli.md) - 完全なAPI仕様

これで、electron-flowを使った型安全なElectronアプリケーション開発を始められます！