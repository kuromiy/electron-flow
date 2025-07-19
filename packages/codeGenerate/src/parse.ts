// Phase 2で実装予定: TypeScript Compiler APIを使用したAST解析

import type { PackageInfo } from './index.js';

/**
 * TypeScriptファイルを解析してAPI関数情報を抽出
 * Phase 2で実装予定
 */
export async function parseTypeScriptFiles(
  _targetPath: string,
  _ignores: string[]
): Promise<PackageInfo[]> {
  throw new Error(
    'parseTypeScriptFiles: Not implemented yet - will be implemented in Phase 2'
  );
}
