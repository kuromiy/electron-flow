// auto generated
import type { createUser, updateUser } from "../../fixture/input/apis-with-external-schema/user-api.js";
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
            createUser: (name: string, email: string, age: number | undefined) => Promise<Result<ReturnTypeUnwrapped<typeof createUser>, unknown>>;
            updateUser: (userId: string, name: string | undefined, email: string | undefined) => Promise<Result<ReturnTypeUnwrapped<typeof updateUser>, unknown>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    createUser: (name: string, email: string, age: number | undefined) => Promise<Result<ReturnTypeUnwrapped<typeof createUser>, unknown>>;
    updateUser: (userId: string, name: string | undefined, email: string | undefined) => Promise<Result<ReturnTypeUnwrapped<typeof updateUser>, unknown>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async createUser(name: string, email: string, age: number | undefined) {
        return window.api.createUser(name, email, age);
    }

    async updateUser(userId: string, name: string | undefined, email: string | undefined) {
        return window.api.updateUser(userId, name, email);
    }
}
