// auto generated
import type { updateRecord, updateRecordErrorHandler } from "../../../fixture/012-validator-and-error-handler/input/apis/sample.js";
import type { Result, UnknownError } from "electron-flow";

// Promise を外す型ユーティリティ
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
// 関数型の戻り値を取得し、Promise を外す型ユーティリティ
type ReturnTypeUnwrapped<T> = T extends (...args: infer _Args) => infer R
    ? UnwrapPromise<R>
    : never;
type UpdateRecordErrorType = NonNullable<ReturnType<typeof updateRecordErrorHandler>>;

// window.api の型定義
declare global {
    interface Window {
        api: {
            updateRecord: (id: string, value: number) => Promise<Result<ReturnTypeUnwrapped<typeof updateRecord>, UpdateRecordErrorType | UnknownError>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    updateRecord: (id: string, value: number) => Promise<Result<ReturnTypeUnwrapped<typeof updateRecord>, UpdateRecordErrorType | UnknownError>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async updateRecord(id: string, value: number) {
        return window.api.updateRecord(id, value);
    }
}
