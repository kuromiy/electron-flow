import { rm } from "fs/promises";
import * as vite from "vite";
import * as esbuild from "esbuild";
import { spawn, ChildProcess } from "child_process";
import { watch as frameworkWatch } from "@electron-flow/framework";
import { ElectronFlowConfig } from "../types";
import { findElectronPath } from "../config";

/**
 * 開発サーバーを起動する
 * @param config - Electron Flow設定
 */
export async function dev(config: ElectronFlowConfig): Promise<void> {
  console.log('🚀 Starting development server...');

  try {
    // Viteキャッシュをクリア
    if (config.dev?.clearViteCache !== false) {
      console.log('🗑️  Clearing Vite cache...');
      await rm('./node_modules/.vite', { recursive: true, force: true });
    }

    // IPC自動生成の監視開始
    console.log('🔍 Starting IPC framework watch...');
    frameworkWatch(config.framework).catch(error => {
      console.error('❌ Framework watch error:', error);
    });

    // レンダラープロセス開発サーバー起動
    console.log('⚡ Starting Vite dev server...');
    const viteServer = await vite.createServer(config.renderer);
    await viteServer.listen(config.dev?.port);
    
    console.log(`📱 Renderer server started on port ${config.dev?.port || 5173}`);

    // プリロード監視ビルド
    console.log('🔧 Starting preload watch build...');
    const preloadContext = await esbuild.context(config.preload);
    await preloadContext.watch();

    // メインプロセス監視ビルド
    console.log('🔧 Starting main process watch build...');
    const mainContext = await esbuild.context(config.main);
    await mainContext.watch();

    // Electron起動
    console.log('🖥️  Starting Electron...');
    const electronPath = config.dev?.electronPath || findElectronPath();
    const electronProcess = spawn(electronPath, ['.'], {
      stdio: ['inherit', 'pipe', 'pipe']
    });

    // Electronプロセスの出力を転送
    electronProcess.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[Electron] ${output}`);
      }
    });

    electronProcess.stderr?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[Electron Error] ${output}`);
      }
    });

    // Electronプロセス終了時のクリーンアップ
    electronProcess.on('close', async (code) => {
      console.log(`🛑 Electron process exited with code ${code}`);
      await cleanup(viteServer, preloadContext, mainContext);
      process.exit(code || 0);
    });

    electronProcess.on('error', (error) => {
      console.error('❌ Failed to start Electron:', error);
      cleanup(viteServer, preloadContext, mainContext);
      process.exit(1);
    });

    // プロセス終了時のクリーンアップハンドラー
    const handleExit = async () => {
      console.log('\n🛑 Shutting down development server...');
      electronProcess.kill();
      await cleanup(viteServer, preloadContext, mainContext);
      process.exit(0);
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    console.log('✅ Development server started successfully');
    console.log('Press Ctrl+C to stop the development server');

  } catch (error) {
    console.error('❌ Failed to start development server:', error);
    process.exit(1);
  }
}

/**
 * クリーンアップ処理
 */
async function cleanup(
  viteServer: vite.ViteDevServer,
  preloadContext: esbuild.BuildContext,
  mainContext: esbuild.BuildContext
): Promise<void> {
  try {
    await Promise.all([
      viteServer.close(),
      preloadContext.dispose(),
      mainContext.dispose()
    ]);
  } catch (error) {
    console.error('⚠️  Cleanup error:', error);
  }
}
