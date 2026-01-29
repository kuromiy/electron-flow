// auto generated
import type { getUser } from "../../fixture/004-external-schema/input/apis/user-api.js";
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
            getUser: (userId: string, email: string) => Promise<Result<ReturnTypeUnwrapped<typeof getUser>, unknown>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    getUser: (userId: string, email: string) => Promise<Result<ReturnTypeUnwrapped<typeof getUser>, unknown>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async getUser(userId: string, email: string) {
        return window.api.getUser(userId, email);
    }
}
