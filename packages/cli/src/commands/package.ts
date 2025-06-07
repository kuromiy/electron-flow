import { rm } from "fs/promises";
import * as vite from "vite";
import * as esbuild from "esbuild";
import packager from "@electron/packager";
import { build as frameworkBuild } from "@electron-flow/framework";
import { ElectronFlowConfig } from "../types";

/**
 * Electronアプリケーションをパッケージングする
 * @param config - Electron Flow設定
 */
export async function packageApp(config: ElectronFlowConfig): Promise<void> {
  console.log('📦 Starting application packaging...');

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

    // パッケージング
    console.log('📦 Packaging Electron application...');
    const appPaths = await packager(config.packager);
    
    console.log('✅ Packaging completed successfully');
    console.log('📁 Package output locations:');
    appPaths.forEach(path => {
      console.log(`   • ${path}`);
    });

  } catch (error) {
    console.error('❌ Packaging failed:', error);
    process.exit(1);
  }
}
