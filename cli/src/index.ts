#!/usr/bin/env node

import { Command } from 'commander';
import { InitCommand } from './commands/init.js';
import { GenCommand } from './commands/gen.js';
import { CLILogger } from './utils/logger.js';
import { ErrorHandler } from './utils/errorHandler.js';

/**
 * electron-flow CLI のメインクラス
 */
class ElectronFlowCLI {
  private program: Command;
  
  constructor() {
    this.program = new Command();
    this.setupGlobalOptions();
    this.registerCommands();
    this.setupErrorHandling();
  }
  
  private setupGlobalOptions(): void {
    // package.json からバージョンを取得
    const packageJson = this.getPackageInfo();
    
    this.program
      .name('electron-flow')
      .description('TypeScript APIから自動でIPC通信コードを生成するElectronアプリケーション開発用ツール')
      .version(packageJson.version || '0.0.1')
      .option('--verbose', '詳細なログ出力', false)
      .option('--debug', 'デバッグモード', false);
  }
  
  private registerCommands(): void {
    const initCommand = new InitCommand();
    const genCommand = new GenCommand();
    
    this.program
      .addCommand(initCommand.getCommand())
      .addCommand(genCommand.getCommand());
  }

  private setupErrorHandling(): void {
    // 未処理のPromise拒否をキャッチ
    process.on('unhandledRejection', (reason, promise) => {
      const logger = new CLILogger(true);
      logger.error('未処理のPromise拒否が発生しました:');
      logger.error(String(reason));
      logger.debug(`Promise: ${promise}`);
      process.exit(1);
    });

    // 未捕獲の例外をキャッチ
    process.on('uncaughtException', (error) => {
      const logger = new CLILogger(true);
      ErrorHandler.handleCLIError(error, logger);
      process.exit(1);
    });
  }

  private getPackageInfo(): { version?: string } {
    try {
      // CLIパッケージのpackage.jsonを読み込み
      return require('../package.json');
    } catch {
      return {};
    }
  }
  
  async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      const logger = new CLILogger(false);
      ErrorHandler.handleCLIError(error as Error, logger);
      process.exit(1);
    }
  }
}

// CLIの実行
const cli = new ElectronFlowCLI();

// グローバルオプションを各コマンドに渡すための処理
const program = cli['program'] as Command;
const originalParse = program.parseAsync.bind(program);

program.parseAsync = async function(this: Command, argv?: string[]): Promise<Command> {
  const globalOpts = this.opts();
  
  // 各コマンドのアクションにグローバルオプションを注入
  this.commands.forEach((cmd: Command) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    const originalAction = (cmd as any)._actionHandler as ((...args: any[]) => unknown) | undefined;
    if (originalAction) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cmd as any)._actionHandler = function(this: Command, ...args: any[]): unknown {
        // コマンドのオプションにグローバルオプションをマージ
        const cmdOpts = args[args.length - 1];
        if (typeof cmdOpts === 'object' && cmdOpts !== null) {
          Object.assign(cmdOpts, globalOpts);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return originalAction.apply(this, args as any);
      };
    }
  });
  
  return originalParse.call(this, argv);
};

cli.run(process.argv).catch((error) => {
  const logger = new CLILogger(false);
  ErrorHandler.handleCLIError(error, logger);
  process.exit(1);
});
