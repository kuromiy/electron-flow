// ランタイムの型とユーティリティをすべてエクスポート
export type { ErrorValue } from './error';
export type { Result, Success, Failure } from './result';
export { success, failure, isSuccess, isFailure } from './result';