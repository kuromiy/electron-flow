import type { ErrorValue } from './error';

/**
 * 型Tの値を含む成功結果を表現する
 */
export type Success<T> = {
  _tag: 'success';
  value: T;
};

/**
 * エラー情報を含む失敗結果を表現する
 */
export type Failure = {
  _tag: 'failure';
  value: ErrorValue[];
};

/**
 * SuccessまたはFailureのいずれかとなるResult型
 */
export type Result<T> = Success<T> | Failure;

/**
 * 成功結果を作成する
 * @param value 成功時の値
 * @returns Success結果
 */
export function success<T>(value: T): Success<T> {
  return { _tag: 'success', value };
}

/**
 * 失敗結果を作成する
 * @param value エラー値の配列
 * @returns Failure結果
 */
export function failure(value: ErrorValue[]): Failure {
  return { _tag: 'failure', value };
}

/**
 * 結果が成功かどうかをチェックする型ガード
 * @param result チェックする結果
 * @returns 結果がSuccessの場合true、そうでなければfalse
 */
export function isSuccess<T>(result: Result<T>): result is Success<T> {
  return result._tag === 'success';
}

/**
 * 結果が失敗かどうかをチェックする型ガード
 * @param result チェックする結果
 * @returns 結果がFailureの場合true、そうでなければfalse
 */
export function isFailure<T>(result: Result<T>): result is Failure {
  return result._tag === 'failure';
}