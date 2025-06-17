import type { DevOptions } from '../types';
import { loadConfig } from '../config-loader';
import { ElectronFlowError } from '../error-handler';
import { generate } from './generate';
import { watch as chokidarWatch } from 'chokidar';
import { join } from 'path';
import { debounce } from 'lodash';
import { spawn, ChildProcess } from 'child_process';

let chalk: any;
let ora: any;

try {
  chalk = require('chalk');
  ora = require('ora');
} catch (e) {
  // テスト環境では無視
  chalk = { 
    green: (s: string) => s, 
    gray: (s: string) => s, 
    yellow: (s: string) => s,
    cyan: (s: string) => s,
    blue: (s: string) => s,
    red: (s: string) => s,
    magenta: (s: string) => s
  };
  ora = () => ({ start: () => ({ text: '', succeed: () => {}, fail: () => {}, info: () => {} }) });
}

interface DevServerState {
  electronProcess?: ChildProcess;
  isRestarting: boolean;
}

/**
 * ホットリロード付き開発サーバーを開始する
 */
export async function dev(options: DevOptions): Promise<void> {
  const spinner = ora('開発サーバーを初期化しています...').start();
  const state: DevServerState = { isRestarting: false };
  
  try {
    // 設定を読み込み
    const config = await loadConfig(options.config || 'electron-flow.config.ts');
    spinner.text = `設定を読み込みました: ${options.config || 'electron-flow.config.ts'}`;
    
    // 初回コード生成
    spinner.text = 'IPCコードを生成しています...';
    await generate({ config: options.config });
    
    spinner.succeed('IPCコードを生成しました');
    
    // Electronプロセス起動
    const electronEntry = config.dev?.electronEntry || './dist/main.js';
    await startElectronProcess(state, electronEntry);
    
    // ファイル監視の設定
    const watchPaths = [
      join(config.handlersDir, '**/*.ts'),
      join(config.handlersDir, '**/*.js'),
      config.contextPath,
      config.errorHandlerPath,
      options.config || 'electron-flow.config.ts',
      ...(config.dev?.watchPaths || [])
    ];
    
    console.log(chalk.cyan('\n📂 監視対象:'));
    for (const path of watchPaths) {
      console.log(chalk.gray(`  - ${path}`));
    }
    
    // デバウンス付きの再起動関数
    const debouncedRestart = debounce(async (filePath: string) => {
      if (state.isRestarting) return;
      
      state.isRestarting = true;
      const restartSpinner = ora(`変更検知: ${chalk.yellow(filePath)} - 再起動中...`).start();
      
      try {
        // Electronプロセスを停止
        if (state.electronProcess) {
          state.electronProcess.kill();
          state.electronProcess = undefined;
        }
        
        // IPCコードを再生成
        await generate({ config: options.config });
        
        // Electronプロセスを再起動
        await startElectronProcess(state, electronEntry);
        
        restartSpinner.succeed(`再起動完了: ${chalk.green(new Date().toLocaleTimeString())}`);
      } catch (error) {
        restartSpinner.fail('再起動に失敗しました');
        console.error(chalk.red(error instanceof Error ? error.message : '不明なエラー'));
      } finally {
        state.isRestarting = false;
      }
    }, 500); // 500msのデバウンス
    
    // ファイル監視開始
    const watcher = chokidarWatch(watchPaths, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        config.outDir + '/**',
        '**/*.d.ts'
      ],
      ignoreInitial: true,
      persistent: true
    });
    
    // イベントリスナー設定
    watcher
      .on('change', (filePath) => {
        console.log(chalk.blue(`\n🔄 変更検知: ${filePath}`));
        debouncedRestart(filePath);
      })
      .on('add', (filePath) => {
        console.log(chalk.green(`\n➕ ファイル追加: ${filePath}`));
        debouncedRestart(filePath);
      })
      .on('unlink', (filePath) => {
        console.log(chalk.yellow(`\n🗑️  ファイル削除: ${filePath}`));
        debouncedRestart(filePath);
      })
      .on('error', (error) => {
        console.error(chalk.red(`\n❌ 監視エラー: ${error.message}`));
      });
    
    console.log(chalk.green('\n🚀 開発サーバーが開始されました'));
    console.log(chalk.gray('Ctrl+C でサーバーを停止します\n'));
    
    // graceful shutdown
    const cleanup = () => {
      console.log(chalk.yellow('\n🛑 開発サーバーを停止しています...'));
      
      if (state.electronProcess) {
        state.electronProcess.kill();
      }
      
      watcher.close();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // プロセスを永続化（監視継続）
    return new Promise(() => {}); // 永続化
    
  } catch (error) {
    spinner.fail('開発サーバーの開始に失敗しました');
    
    if (error instanceof ElectronFlowError) {
      throw error;
    }
    throw new ElectronFlowError(
      `開発サーバーの開始に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      'DEV_FAILED'
    );
  }
}

/**
 * Electronプロセスを起動する
 */
async function startElectronProcess(state: DevServerState, electronEntry: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const startSpinner = ora('Electronプロセスを起動しています...').start();
    
    try {
      // Electronプロセスを起動
      const electronProcess = spawn('npx', ['electron', electronEntry], {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });
      
      state.electronProcess = electronProcess;
      
      // 標準出力を監視してプロセス起動完了を検知
      let startupDetected = false;
      
      electronProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(chalk.gray(`[Electron] ${output}`));
        
        // 起動完了の検知（最初の出力があれば起動完了とみなす）
        if (!startupDetected) {
          startupDetected = true;
          startSpinner.succeed('Electronプロセスが起動しました');
          resolve();
        }
      });
      
      electronProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        process.stderr.write(chalk.red(`[Electron Error] ${output}`));
      });
      
      electronProcess.on('close', (code) => {
        if (code !== 0 && code !== null) {
          console.log(chalk.yellow(`\n📱 Electronプロセスが終了しました (code: ${code})`));
        }
      });
      
      electronProcess.on('error', (error) => {
        startSpinner.fail('Electronプロセスの起動に失敗しました');
        reject(new Error(`Electronの起動に失敗: ${error.message}`));
      });
      
      // タイムアウト（5秒後に強制的に起動完了とみなす）
      setTimeout(() => {
        if (!startupDetected) {
          startupDetected = true;
          startSpinner.succeed('Electronプロセスが起動しました');
          resolve();
        }
      }, 5000);
      
    } catch (error) {
      startSpinner.fail('Electronプロセスの起動に失敗しました');
      reject(error);
    }
  });
}