import type { InlineConfig } from "vite";
import type { BuildOptions } from "esbuild";
import type { Options as PackagerOptions } from "@electron/packager";
import type { IpcFrameworkConfig } from "@electron-flow/framework";
import type { BaseConfig } from "@electron-flow/shared";

export interface ElectronFlowConfig extends BaseConfig {
  /**
   * IPC自動生成フレームワークの設定
   */
  framework: IpcFrameworkConfig;
  
  /**
   * Vite設定（レンダラープロセス）
   */
  renderer: InlineConfig;
  
  /**
   * ESBuild設定（プリロードプロセス）
   */
  preload: BuildOptions;
  
  /**
   * ESBuild設定（メインプロセス）
   */
  main: BuildOptions;
  
  /**
   * Electronパッケージング設定
   */
  packager: PackagerOptions;
  
  /**
   * 開発モード固有の設定
   */
  dev?: {
    /**
     * Electronバイナリのパス（自動検出される場合は省略可能）
     */
    electronPath?: string;
    
    /**
     * 起動時にViteキャッシュをクリアするか
     */
    clearViteCache?: boolean;
    
    /**
     * 開発サーバーのポート
     */
    port?: number;
  };
}

/**
 * 設定ファイル定義用のヘルパー関数
 * @param config - Electron Flow設定
 * @returns 設定オブジェクト
 */
export function defineConfig(config: ElectronFlowConfig): ElectronFlowConfig {
  return config;
}

/**
 * デフォルト設定値
 */
export const defaultConfig: Partial<ElectronFlowConfig> = {
  dev: {
    clearViteCache: true,
    port: 5173
  }
};
