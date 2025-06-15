// ユーザー向けランタイム型とユーティリティをエクスポート
export type { ErrorValue, Result, Success, Failure } from './runtime';
export { success, failure, isSuccess, isFailure } from './runtime';

// 設定型をエクスポート
export type { ElectronFlowConfig } from './cli/types';