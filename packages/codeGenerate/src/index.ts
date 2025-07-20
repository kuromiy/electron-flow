// Phase 2以降で実装される関数のプレースホルダー

// 詳細な型定義を再エクスポート
export * from './types.js';
import type { BuildResult } from './types.js';

// 既存の設定インターフェース（後方互換性のため維持）
export interface AutoCodeOption {
  targetPath: string;
  ignores: string[];
  preloadPath: string;
  registerPath: string;
  rendererPath: string;
  contextPath?: string;
  errorHandler?: {
    handlerPath: string;
    handlerName: string;
    defaultHandler?: boolean;
  };
}

// 後方互換性のための旧型定義（非推奨）
/** @deprecated Use detailed types from types.ts instead */
export interface FieldInfo {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: unknown;
}

/** @deprecated Use detailed types from types.ts instead */
export interface ParamInfo {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
}

/**
 * 一回限りのビルド実行
 * Phase 2で実装予定
 */
// eslint-disable-next-line no-unused-vars
export async function build(_option: AutoCodeOption): Promise<BuildResult> {
  throw new Error('Not implemented yet - will be implemented in Phase 2');
}

/**
 * ファイル監視付きビルド実行
 * Phase 6で実装予定
 */
// eslint-disable-next-line no-unused-vars
export async function watchBuild(_option: AutoCodeOption): Promise<void> {
  throw new Error('Not implemented yet - will be implemented in Phase 6');
}
