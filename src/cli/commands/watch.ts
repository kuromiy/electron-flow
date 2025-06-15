import type { WatchOptions } from '../types';
import { loadConfig } from '../config-loader';
import { ElectronFlowError } from '../error-handler';
import { generate } from './generate';
import { watch as chokidarWatch } from 'chokidar';
import { join, dirname } from 'path';
import { debounce } from 'lodash';

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
    red: (s: string) => s
  };
  ora = () => ({ start: () => ({ text: '', succeed: () => {}, fail: () => {}, info: () => {} }) });
}

/**
 * 変更を監視してIPCコードを再生成する
 */
export async function watch(options: WatchOptions): Promise<void> {
  const spinner = ora('ファイル監視を開始しています...').start();
  
  try {
    // 設定を読み込み
    const config = await loadConfig(options.config || 'electron-flow.config.ts');
    spinner.text = `設定を読み込みました: ${options.config || 'electron-flow.config.ts'}`;
    
    // 初回生成
    spinner.text = '初回コード生成を実行しています...';
    await generate({ config: options.config });
    
    // 監視対象パスを設定
    const watchPaths = [
      join(config.handlersDir, '**/*.ts'),
      join(config.handlersDir, '**/*.js'),
      config.contextPath,
      config.errorHandlerPath,
      options.config || 'electron-flow.config.ts'
    ];
    
    spinner.succeed('初回コード生成が完了しました');
    console.log(chalk.cyan('\n📂 監視対象:'));
    for (const path of watchPaths) {
      console.log(chalk.gray(`  - ${path}`));
    }
    
    // デバウンス付きの再生成関数
    const debouncedRegenerate = debounce(async (filePath: string) => {
      const regenSpinner = ora(`変更検知: ${chalk.yellow(filePath)}`).start();
      
      try {
        await generate({ config: options.config });
        regenSpinner.succeed(`コード再生成完了: ${chalk.green(new Date().toLocaleTimeString())}`);
      } catch (error) {
        regenSpinner.fail('コード生成に失敗しました');
        console.error(chalk.red(error instanceof Error ? error.message : '不明なエラー'));
      }
    }, 300); // 300ms のデバウンス
    
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
        debouncedRegenerate(filePath);
      })
      .on('add', (filePath) => {
        console.log(chalk.green(`\n➕ ファイル追加: ${filePath}`));
        debouncedRegenerate(filePath);
      })
      .on('unlink', (filePath) => {
        console.log(chalk.yellow(`\n🗑️  ファイル削除: ${filePath}`));
        debouncedRegenerate(filePath);
      })
      .on('error', (error) => {
        console.error(chalk.red(`\n❌ 監視エラー: ${error.message}`));
      });
    
    console.log(chalk.green('\n👀 ファイル監視が開始されました'));
    console.log(chalk.gray('Ctrl+C で監視を停止します\n'));
    
    // graceful shutdown
    const cleanup = () => {
      console.log(chalk.yellow('\n🛑 監視を停止しています...'));
      watcher.close();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // プロセスを永続化（監視継続）
    return new Promise(() => {}); // 永続化
    
  } catch (error) {
    spinner.fail('監視の開始に失敗しました');
    
    if (error instanceof ElectronFlowError) {
      throw error;
    }
    throw new ElectronFlowError(
      `監視の開始に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      'WATCH_FAILED'
    );
  }
}