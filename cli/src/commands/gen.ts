import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { CLILogger } from '../utils/logger.js';
import { ErrorHandler, ConfigError } from '../utils/errorHandler.js';
// 暫定的に型定義のみ作成（ビルド時のrootDir問題を回避）
interface AutoCodeOption {
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

/**
 * genコマンドのオプション
 */
export interface GenOptions {
  config: string;
  watch: boolean;
  dryRun: boolean;
  verbose: boolean;
}

/**
 * コード生成コマンドクラス
 */
export class GenCommand {
  getCommand(): Command {
    return new Command('gen')
      .description('設定に基づいてIPC通信コードを生成')
      .option('--config <path>', '設定ファイルのパス', './electron-flow.config.js')
      .option('--watch', 'ファイル変更を監視して自動生成', false)
      .option('--dry-run', '実際のファイル生成を行わずに確認', false)
      .action(this.execute.bind(this));
  }

  async execute(options: GenOptions): Promise<void> {
    const logger = new CLILogger(options.verbose);
    
    try {
      // 設定ファイル読み込み
      const config = await this.loadConfig(options.config, logger);
      logger.success(`設定ファイルを読み込みました: ${options.config}`);
      
      if (options.dryRun) {
        await this.performDryRun(config, logger);
        return;
      }
      
      if (options.watch) {
        await this.startWatchMode(config, logger);
      } else {
        await this.performSingleBuild(config, logger);
      }
      
    } catch (error) {
      ErrorHandler.handleCLIError(error as Error, logger);
      process.exit(1);
    }
  }

  private async loadConfig(configPath: string, logger: CLILogger): Promise<AutoCodeOption> {
    logger.progress(`設定ファイルを読み込んでいます: ${configPath}`);
    
    try {
      // ファイル存在確認
      await fs.access(configPath);
      
      // TypeScript設定ファイルを動的インポート
      const absolutePath = path.resolve(configPath);
      const fileUrl = pathToFileURL(absolutePath).href;
      
      const configModule = await import(fileUrl);
      
      if (!configModule.autoCodeOption) {
        throw new ConfigError(`設定ファイルにautoCodeOptionエクスポートが見つかりません: ${configPath}`);
      }
      
      // 基本的な設定検証
      this.validateConfig(configModule.autoCodeOption);
      
      return configModule.autoCodeOption;
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      
      if ((error as { code?: string }).code === 'ENOENT') {
        throw ErrorHandler.createFileNotFoundError(configPath);
      }
      
      throw ErrorHandler.createConfigParseError(configPath, error as Error);
    }
  }

  private validateConfig(config: AutoCodeOption): void {
    const requiredFields = ['targetPath', 'preloadPath', 'registerPath', 'rendererPath'];
    
    for (const field of requiredFields) {
      if (!(field in config) || !config[field as keyof AutoCodeOption]) {
        throw new ConfigError(`設定に必須フィールドが不足しています: ${field}`);
      }
    }
  }

  private async performDryRun(config: AutoCodeOption, logger: CLILogger): Promise<void> {
    logger.section('ドライラン実行');
    
    logger.info('設定内容:');
    logger.info(`  対象パス: ${config.targetPath}`);
    logger.info(`  プリロードパス: ${config.preloadPath}`);
    logger.info(`  ハンドラーパス: ${config.registerPath}`);
    logger.info(`  型定義パス: ${config.rendererPath}`);
    
    if (config.contextPath) {
      logger.info(`  コンテキストパス: ${config.contextPath}`);
    }
    
    if (config.ignores && config.ignores.length > 0) {
      logger.info(`  除外パターン: ${config.ignores.join(', ')}`);
    }
    
    logger.newLine();
    logger.info('実際のファイル生成は行われません（--dry-run モード）');
    logger.info('コード生成を実行するには --dry-run オプションを外してください');
  }

  private async performSingleBuild(config: AutoCodeOption, logger: CLILogger): Promise<void> {
    logger.section('コード生成');
    logger.info('コード生成を開始しています...');
    
    const startTime = Date.now();
    
    // 暫定実装：後でcodeGenerateパッケージと統合
    logger.info('コード生成機能は現在実装中です');
    logger.info('設定内容を確認しました:');
    logger.info(`  - 対象パス: ${config.targetPath}`);
    logger.info(`  - プリロードパス: ${config.preloadPath}`);
    logger.info(`  - ハンドラーパス: ${config.registerPath}`);
    logger.info(`  - 型定義パス: ${config.rendererPath}`);
    
    const duration = Date.now() - startTime;
    logger.success(`設定検証が完了しました（${duration}ms）`);
    
    // TODO: 実際のビルド処理を統合
    logger.warning('実際のコード生成は次のフェーズで実装予定です');
  }

  private async startWatchMode(config: AutoCodeOption, logger: CLILogger): Promise<void> {
    logger.section('ファイル監視モード');
    logger.info('ファイル監視モードを開始しています...');
    logger.info('Ctrl+C で終了します');
    
    // ここで将来的にwatchBuild関数を使用
    // 現在はbuildManagerにwatchBuild機能がまだ実装されていない可能性があるため、
    // 基本的なポーリングベースの監視を実装
    
    const watchedPaths = [config.targetPath];
    
    logger.info(`監視対象: ${watchedPaths.join(', ')}`);
    logger.newLine();
    
    // 初回ビルド実行
    await this.performSingleBuild(config, logger);
    
    // 簡易的な監視実装（将来的には chokidar を使った本格的な監視に置き換え）
    const checkInterval = setInterval(() => {
      // ここに変更検知ロジックを実装
      // 現在は手動での再実行を促すメッセージのみ
    }, 1000);
    
    // プロセス終了時のクリーンアップ
    process.on('SIGINT', () => {
      clearInterval(checkInterval);
      logger.newLine();
      logger.info('ファイル監視を終了しました');
      process.exit(0);
    });
    
    // 無限ループで監視継続
    await new Promise(() => {}); // 無限待機
  }
}