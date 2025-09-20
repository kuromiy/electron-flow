// auto generated
import type { showDialog } from "../../fixture/input/with-electron/dialog.js";
import type { Result } from "electron-flow";

// Promise を外す型ユーティリティ
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
// 関数型の戻り値を取得し、Promise を外す型ユーティリティ
type ReturnTypeUnwrapped<T> = T extends (...args: unknown[]) => infer R
    ? UnwrapPromise<R>
    : never;

// window.api の型定義
declare global {
    interface Window {
        api: {
            showDialog: (title: string, message: string) => Promise<Result<ReturnTypeUnwrapped<typeof showDialog>, Error>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    showDialog: (title: string, message: string) => Promise<Result<ReturnTypeUnwrapped<typeof showDialog>, Error>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async showDialog(title: string, message: string) {
        return window.api.showDialog(title, message);
    }
}
