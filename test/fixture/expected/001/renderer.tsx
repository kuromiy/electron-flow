// auto generated
import type { execute } from "../../fixture/input/apis/sample1.js";
import type { Result } from "electron-flow";

// Promise を外す型ユーティリティ
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
// 関数型の戻り値を取得し、Promise を外す型ユーティリティ
type ReturnTypeUnwrapped<T> = T extends (...args: any[]) => infer R
    ? UnwrapPromise<R>
    : never;

// window.api の型定義
declare global {
    interface Window {
        api: {
            execute: (resourceId: string, rawTags: string, authorId: string | undefined) => Promise<Result<ReturnTypeUnwrapped<typeof execute>, Error>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    execute: (resourceId: string, rawTags: string, authorId: string | undefined) => Promise<Result<ReturnTypeUnwrapped<typeof execute>, Error>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async execute(resourceId: string, rawTags: string, authorId: string | undefined) {
        return window.api.execute(resourceId, rawTags, authorId);
    }
}
