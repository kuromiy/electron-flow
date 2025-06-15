import { program } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { wrapAsyncCommand } from './error-handler';

// バージョン取得のためのpackage.json読み込み
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

// CLIプログラムのセットアップ
program
  .name('electron-flow')
  .description('Electronアプリケーション用の型安全IPCコードジェネレーター')
  .version(packageJson.version);

// initコマンド
program
  .command('init')
  .description('新しいelectron-flowプロジェクトを初期化')
  .option('--force', '既存ファイルを上書き')
  .action(wrapAsyncCommand(async (options) => {
    const { init } = await import('./commands/init');
    await init(options);
  }));

// generateコマンド
program
  .command('generate')
  .alias('gen')
  .description('ハンドラー関数からIPCコードを生成')
  .option('-c, --config <path>', '設定ファイルへのパス', 'electron-flow.config.ts')
  .option('--dry-run', 'ファイルを書き込まずに変更をプレビュー')
  .action(wrapAsyncCommand(async (options) => {
    const { generate } = await import('./commands/generate');
    await generate(options);
  }));

// watchコマンド
program
  .command('watch')
  .description('変更を監視してIPCコードを再生成')
  .option('-c, --config <path>', '設定ファイルへのパス', 'electron-flow.config.ts')
  .action(wrapAsyncCommand(async (options) => {
    const { watch } = await import('./commands/watch');
    await watch(options);
  }));

// devコマンド
program
  .command('dev')
  .description('ホットリロード付き開発サーバーを開始')
  .option('-c, --config <path>', '設定ファイルへのパス', 'electron-flow.config.ts')
  .action(wrapAsyncCommand(async (options) => {
    const { dev } = await import('./commands/dev');
    await dev(options);
  }));

// コマンドライン引数を解析
program.parse(process.argv);