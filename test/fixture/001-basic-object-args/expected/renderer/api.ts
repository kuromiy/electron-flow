// auto generated
import type { execute } from "../../../fixture/001-basic-object-args/input/apis/sample.js";
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
            execute: (id: string, name: string) => Promise<Result<ReturnTypeUnwrapped<typeof execute>, UnknownError>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    execute: (id: string, name: string) => Promise<Result<ReturnTypeUnwrapped<typeof execute>, UnknownError>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async execute(id: string, name: string) {
        return window.api.execute(id, name);
    }
}
