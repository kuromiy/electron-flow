// auto generated
import type { execute } from "../../fixture/input/apis3/sample3.js";
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
            execute: (page: number, limit: number, searchQuery: string | undefined, sortKey: "createdAt" | "updatedAt" | "serviceName", sortOrder: "asc" | "desc") => Promise<Result<ReturnTypeUnwrapped<typeof execute>, unknown>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    execute: (page: number, limit: number, searchQuery: string | undefined, sortKey: "createdAt" | "updatedAt" | "serviceName", sortOrder: "asc" | "desc") => Promise<Result<ReturnTypeUnwrapped<typeof execute>, unknown>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async execute(page: number, limit: number, searchQuery: string | undefined, sortKey: "createdAt" | "updatedAt" | "serviceName", sortOrder: "asc" | "desc") {
        return window.api.execute(page, limit, searchQuery, sortKey, sortOrder);
    }
}
