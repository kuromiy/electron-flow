// auto generated
import type { saveData, saveDataErrorHandler } from "../../../fixture/011-error-handler-config/input/apis/sample.js";
import type { Result, UnknownError } from "electron-flow";

// Promise を外す型ユーティリティ
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
// 関数型の戻り値を取得し、Promise を外す型ユーティリティ
type ReturnTypeUnwrapped<T> = T extends (...args: infer _Args) => infer R
    ? UnwrapPromise<R>
    : never;
type SaveDataErrorType = NonNullable<ReturnType<typeof saveDataErrorHandler>>;

// window.api の型定義
declare global {
    interface Window {
        api: {
            saveData: (data: string) => Promise<Result<ReturnTypeUnwrapped<typeof saveData>, SaveDataErrorType | UnknownError>>;
        };
    }
}

// サービスインターフェース
export interface ServiceIF {
    saveData: (data: string) => Promise<Result<ReturnTypeUnwrapped<typeof saveData>, SaveDataErrorType | UnknownError>>;
}

// サービス実装クラス
export class ApiService implements ServiceIF {
    async saveData(data: string) {
        return window.api.saveData(data);
    }
}
