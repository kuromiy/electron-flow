// auto generated
import type { updateItem } from "../../../fixture/006-optional-props/input/apis/sample.js";
import type { Result, UnknownError } from "electron-flow";

// Promise を外す型ユーティリティ
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
// 関数型の戻り値を取得し、Promise を外す型ユーティリティ
type ReturnTypeUnwrapped<T> = T extends (...args: infer _Args) => infer R
    ? UnwrapPromise<R>
    : never;

// window.api の型定義
declare global {
    interface Window {
        api: {
            updateItem: (id: string, name: string | undefined, description: string | undefined) => Promise<Result<ReturnTypeUnwrapped<typeof updateItem>, UnknownError>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    updateItem: (id: string, name: string | undefined, description: string | undefined) => Promise<Result<ReturnTypeUnwrapped<typeof updateItem>, UnknownError>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async updateItem(id: string, name: string | undefined, description: string | undefined) {
        return window.api.updateItem(id, name, description);
    }
}
