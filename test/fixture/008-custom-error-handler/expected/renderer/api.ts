// auto generated
import type { processData } from "../../../fixture/008-custom-error-handler/input/apis/sample.js";
import type { handleError } from "../../../fixture/_shared/error-handler.js";
import type { Result, UnknownError } from "electron-flow";

// Promise を外す型ユーティリティ
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
// 関数型の戻り値を取得し、Promise を外す型ユーティリティ
type ReturnTypeUnwrapped<T> = T extends (...args: infer _Args) => infer R
    ? UnwrapPromise<R>
    : never;
// グローバルエラーハンドラーの型（生の値を返す）
type GlobalErrorType = ReturnType<typeof handleError>;

// window.api の型定義
declare global {
    interface Window {
        api: {
            processData: (data: string) => Promise<Result<ReturnTypeUnwrapped<typeof processData>, GlobalErrorType | UnknownError>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    processData: (data: string) => Promise<Result<ReturnTypeUnwrapped<typeof processData>, GlobalErrorType | UnknownError>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async processData(data: string) {
        return window.api.processData(data);
    }
}
