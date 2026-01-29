// auto generated
import type { included } from "../../../fixture/009-ignores/input/apis/sample.js";
import type { Result } from "electron-flow";

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
            included: () => Promise<Result<ReturnTypeUnwrapped<typeof included>, unknown>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    included: () => Promise<Result<ReturnTypeUnwrapped<typeof included>, unknown>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async included() {
        return window.api.included();
    }
}
