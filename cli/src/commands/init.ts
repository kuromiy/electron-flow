import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CLILogger } from '../utils/logger.js';
import { ErrorHandler, FileSystemError, ConfigError } from '../utils/errorHandler.js';

/**
 * initコマンドのオプション
 */
export interface InitOptions {
  configPath: string;
  contextPath: string;
  force: boolean;
  skipContext: boolean;
  verbose: boolean;
}

/**
 * プロジェクト初期化コマンドクラス
 */
export class InitCommand {
  getCommand(): Command {
    return new Command('init')
      .description('プロジェクトを初期化し、設定ファイルを生成')
      .option('--config-path <path>', '設定ファイルの出力パス', './electron-flow.config.js')
      .option('--context-path <path>', 'Context型定義の出力パス', './src/types/context.ts')
      .option('--force', '既存ファイルを上書き', false)
      .option('--skip-context', 'Context型定義ファイルの生成をスキップ', false)
      .action(this.execute.bind(this));
  }

  async execute(options: InitOptions): Promise<void> {
    const logger = new CLILogger(options.verbose);
    
    try {
      logger.section('electron-flow プロジェクトの初期化');
      
      // 1. 設定ファイル生成
      await this.generateConfigFile(options, logger);
      logger.success(`設定ファイルを生成しました: ${options.configPath}`);
      
      // 2. Context型定義生成（オプション）
      if (!options.skipContext) {
        await this.generateContextFile(options, logger);
        logger.success(`Context型定義を生成しました: ${options.contextPath}`);
      }
      
      // 3. 初期ディレクトリ構造の作成
      await this.createDirectoryStructure(options, logger);
      
      logger.newLine();
      logger.success('初期化が完了しました！');
      logger.newLine();
      logger.info('次のステップ:');
      logger.info('1. src/main/api/ ディレクトリにAPI関数を作成');
      logger.info('2. npx electron-flow gen でコードを生成');
      
    } catch (error) {
      ErrorHandler.handleCLIError(error as Error, logger);
      process.exit(1);
    }
  }

  private async generateConfigFile(options: InitOptions, logger: CLILogger): Promise<void> {
    logger.progress('設定ファイルを生成しています...');
    
    // ファイル存在チェック
    if (!options.force && await this.fileExists(options.configPath)) {
      throw new ConfigError(`設定ファイルが既に存在します: ${options.configPath}. --force オプションを使用して上書きしてください。`);
    }

    const configTemplate = `// @ts-check

/**
 * @type {import('electron-flow').AutoCodeOption}
 */
export const autoCodeOption = {
  targetPath: "./src/main/api",
  ignores: [],
  preloadPath: "./src/preload/autogenerate/index.ts",
  registerPath: "./src/main/register/autogenerate/index.ts",
  rendererPath: "./src/renderer/autogenerate/index.d.ts",
  contextPath: "${options.contextPath}",
  
  // オプション設定
  // errorHandler: {
  //   handlerPath: "../../errors/handler",
  //   handlerName: "customErrorHandler",
  //   defaultHandler: true
  // }
};
`;
    
    await this.writeFileWithDirs(options.configPath, configTemplate);
  }

  private async generateContextFile(options: InitOptions, logger: CLILogger): Promise<void> {
    logger.progress('Context型定義ファイルを生成しています...');
    
    // ファイル存在チェック
    if (!options.force && await this.fileExists(options.contextPath)) {
      throw new ConfigError(`Context型定義ファイルが既に存在します: ${options.contextPath}. --force オプションを使用して上書きしてください。`);
    }

    const contextTemplate = `import type { IpcMainInvokeEvent } from 'electron';

/**
 * electron-flow で使用するコンテキスト型
 * 
 * この型定義をカスタマイズして、API関数で使用する共通の情報を追加できます。
 * 例: ユーザー情報、データベース接続、設定など
 */
export interface Context {
  /** IPCイベントオブジェクト */
  event: IpcMainInvokeEvent;
  
  // カスタムフィールドを追加
  // 例:
  // user?: {
  //   id: string;
  //   name: string;
  //   roles: string[];
  // };
  // db?: DatabaseConnection;
  // config?: AppConfig;
}
`;
    
    await this.writeFileWithDirs(options.contextPath, contextTemplate);
  }

  private async createDirectoryStructure(options: InitOptions, logger: CLILogger): Promise<void> {
    logger.progress('ディレクトリ構造を作成しています...');
    
    const directories = [
      './src/main/api',
      './src/preload/autogenerate',
      './src/main/register/autogenerate',
      './src/renderer/autogenerate'
    ];

    for (const dir of directories) {
      await this.ensureDirectory(dir);
      logger.debug(`ディレクトリを作成しました: ${dir}`);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new FileSystemError(`ディレクトリの作成に失敗しました: ${dirPath}`, dirPath);
    }
  }

  private async writeFileWithDirs(filePath: string, content: string): Promise<void> {
    try {
      // ディレクトリを作成
      const dir = path.dirname(filePath);
      await this.ensureDirectory(dir);
      
      // ファイルを書き込み
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new FileSystemError(`ファイルの書き込みに失敗しました: ${filePath}`, filePath);
    }
  }
}