// auto generated
import type { createItem } from "../../fixture/010-validator-config/input/apis/sample.js";
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
            createItem: (name: string, price: number) => Promise<Result<ReturnTypeUnwrapped<typeof createItem>, unknown>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    createItem: (name: string, price: number) => Promise<Result<ReturnTypeUnwrapped<typeof createItem>, unknown>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async createItem(name: string, price: number) {
        return window.api.createItem(name, price);
    }
}
