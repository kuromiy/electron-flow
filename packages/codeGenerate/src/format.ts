// Phase 3で実装予定: コード生成エンジン

import type { PackageInfo, ZodObjectInfo, AutoCodeOption } from './index.js';

/**
 * プリロードスクリプトを生成
 * Phase 3で実装予定
 */
export function generatePreloadScript(_packages: PackageInfo[]): string {
  throw new Error(
    'generatePreloadScript: Not implemented yet - will be implemented in Phase 3'
  );
}

/**
 * IPCハンドラーコードを生成
 * Phase 3で実装予定
 */
export function generateHandlers(
  _packages: PackageInfo[],
  _errorHandler?: AutoCodeOption['errorHandler']
): string {
  throw new Error(
    'generateHandlers: Not implemented yet - will be implemented in Phase 3'
  );
}

/**
 * TypeScript型定義を生成
 * Phase 3で実装予定
 */
export function generateTypeDefinitions(
  _packages: PackageInfo[],
  _zodInfos: ZodObjectInfo[]
): string {
  throw new Error(
    'generateTypeDefinitions: Not implemented yet - will be implemented in Phase 3'
  );
}
