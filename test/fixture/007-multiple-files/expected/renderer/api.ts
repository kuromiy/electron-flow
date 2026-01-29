// auto generated
import type { alpha, beta } from "../../../fixture/007-multiple-files/input/apis/file1.js";
import type { gamma } from "../../../fixture/007-multiple-files/input/apis/file2.js";
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
            alpha: () => Promise<Result<ReturnTypeUnwrapped<typeof alpha>, unknown>>;
            beta: (value: number) => Promise<Result<ReturnTypeUnwrapped<typeof beta>, unknown>>;
            gamma: (name: string) => Promise<Result<ReturnTypeUnwrapped<typeof gamma>, unknown>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    alpha: () => Promise<Result<ReturnTypeUnwrapped<typeof alpha>, unknown>>;
    beta: (value: number) => Promise<Result<ReturnTypeUnwrapped<typeof beta>, unknown>>;
    gamma: (name: string) => Promise<Result<ReturnTypeUnwrapped<typeof gamma>, unknown>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async alpha() {
        return window.api.alpha();
    }

    async beta(value: number) {
        return window.api.beta(value);
    }

    async gamma(name: string) {
        return window.api.gamma(name);
    }
}
