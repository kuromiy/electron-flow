// auto generated
import type { ping } from "../../fixture/input/apis2/sample2.js";
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
            ping: () => Promise<Result<ReturnTypeUnwrapped<typeof ping>, Error>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    ping: () => Promise<Result<ReturnTypeUnwrapped<typeof ping>, Error>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async ping() {
        return window.api.ping();
    }
}
