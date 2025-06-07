import { rm } from "fs/promises";
import * as vite from "vite";
import * as esbuild from "esbuild";
import { build as frameworkBuild } from "@electron-flow/framework";
import { ElectronFlowConfig } from "../types";

/**
 * プロダクション用ビルドを実行する
 * @param config - Electron Flow設定
 */
export async function build(config: ElectronFlowConfig): Promise<void> {
  console.log('🏗️  Starting production build...');

  try {
    // distフォルダをクリア
    console.log('🗑️  Clearing dist directory...');
    await rm('./dist', { recursive: true, force: true });

    // IPC自動生成
    console.log('🔍 Generating IPC bridge code...');
    await frameworkBuild(config.framework);

    // レンダラープロセスビルド
    console.log('📱 Building renderer process...');
    await vite.build(config.renderer);

    // プリロードビルド
    console.log('🔧 Building preload script...');
    await esbuild.build(config.preload);

    // メインプロセスビルド
    console.log('🔧 Building main process...');
    await esbuild.build(config.main);

    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}
