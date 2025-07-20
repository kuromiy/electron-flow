// Phase 4で完全実装されたモジュール

// 詳細な型定義を再エクスポート
export * from './types.js';
// コード生成関数をエクスポート
export * from './format.js';
// ビルドシステムをエクスポート
export * from './build.js';
// 設定管理をエクスポート
export * from './config.js';
// ファイル管理をエクスポート
export * from './fileManager.js';
// エラーハンドリングをエクスポート
export * from './errorHandler.js';

// Phase 6: 最適化・監視機能を追加エクスポート
// ファイル監視システム
export * from './watch.js';
// キャッシュシステム
export * from './cache.js';
// パフォーマンス監視
export * from './performance.js';
// メモリ最適化・ベンチマーク
export * from './optimizer.js';
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

// Result型（生成コードで使用）
export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: ErrorDetails };

export interface ErrorDetails {
  message: string;
  type: string;
  details?: unknown;
  timestamp: string;
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
 * Phase 6で実装
 */
export async function watchBuild(option: AutoCodeOption): Promise<void> {
  const { FileWatcher } = await import('./watch.js');
  const watcher = new FileWatcher();
  
  // eslint-disable-next-line no-console
  console.log('[electron-flow] 監視モード開始');
  
  try {
    const handle = await watcher.startWatching(option);
    
    // プロセス終了時のクリーンアップ
    const cleanup = async (): Promise<void> => {
      // eslint-disable-next-line no-console
      console.log('\n[electron-flow] 監視モード終了中...');
      await handle.stop();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // 監視を継続
    return new Promise(() => {
      // 無限に待機（SIGINTで終了）
    });
    
  } catch (error) {
    console.error('[electron-flow] 監視モードエラー:', error);
    throw error;
  }
}
