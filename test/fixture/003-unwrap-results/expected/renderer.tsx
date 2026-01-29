// auto generated
import type { getData } from "../../fixture/003-unwrap-results/input/apis/sample.js";
import { isFailure, type Result } from "electron-flow/result";

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
            getData: (id: string) => Promise<Result<ReturnTypeUnwrapped<typeof getData>, unknown>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    getData: (id: string) => Promise<ReturnTypeUnwrapped<typeof getData>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async getData(id: string) {
        const response = await window.api.getData(id);
        if (isFailure(response)) {
            throw response.value;
        }
        return response.value;
    }
}
