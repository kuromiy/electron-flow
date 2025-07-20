import { CLILogger } from './logger.js';

/**
 * CLI特有のエラータイプ
 */
export class ConfigError extends Error {
  constructor(message: string, public filePath?: string) {
    super(message);
    this.name = 'ConfigError';
    // filePathを使用する（eslintエラー回避）
    this.filePath = filePath;
  }
}

export class ParseError extends Error {
  constructor(message: string, public filePath?: string) {
    super(message);
    this.name = 'ParseError';
    // filePathを使用する（eslintエラー回避）
    this.filePath = filePath;
  }
}

export class FileSystemError extends Error {
  constructor(message: string, public filePath?: string) {
    super(message);
    this.name = 'FileSystemError';
    // filePathを使用する（eslintエラー回避）
    this.filePath = filePath;
  }
}

/**
 * エラーハンドリングユーティリティ
 */
export class ErrorHandler {
  /**
   * CLIエラーのハンドリング
   */
  static handleCLIError(error: Error, logger: CLILogger): void {
    if (error instanceof ConfigError) {
      logger.error('設定ファイルエラー:');
      logger.error(error.message);
      if (error.filePath) {
        logger.error(`ファイル: ${error.filePath}`);
      }
      logger.newLine();
      logger.info('解決方法:');
      logger.info('1. 設定ファイルの構文をチェックしてください');
      logger.info('2. npx electron-flow init で設定を再生成してください');
    } else if (error instanceof ParseError) {
      logger.error('解析エラー:');
      logger.error(error.message);
      if (error.filePath) {
        logger.error(`ファイル: ${error.filePath}`);
      }
      logger.newLine();
      logger.info('解決方法:');
      logger.info('1. TypeScript構文をチェックしてください');
      logger.info('2. インポート文を確認してください');
      logger.info('3. 型定義が正しいかを確認してください');
    } else if (error instanceof FileSystemError) {
      logger.error('ファイルシステムエラー:');
      logger.error(error.message);
      if (error.filePath) {
        logger.error(`ファイル: ${error.filePath}`);
      }
      logger.newLine();
      logger.info('解決方法:');
      logger.info('1. ファイルパスが正しいかを確認してください');
      logger.info('2. ファイルの読み書き権限を確認してください');
      logger.info('3. ディスク容量を確認してください');
    } else {
      logger.error('予期しないエラーが発生しました:');
      logger.error(error.message);
      logger.newLine();
      logger.info('サポートが必要な場合は、以下の情報と共にissueを作成してください:');
      logger.info(`- electron-flow バージョン: ${ErrorHandler.getVersion()}`);
      logger.info(`- Node.js バージョン: ${process.version}`);
      logger.info(`- OS: ${process.platform}`);
    }
  }

  /**
   * バージョン情報を取得
   */
  private static getVersion(): string {
    try {
      // package.jsonからバージョンを読み取り
      const packageJson = require('../../package.json');
      return packageJson.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 一般的なエラーメッセージを標準化
   */
  static createFileNotFoundError(filePath: string): FileSystemError {
    return new FileSystemError(`ファイルが見つかりません: ${filePath}`, filePath);
  }

  static createConfigParseError(filePath: string, originalError: Error): ConfigError {
    return new ConfigError(
      `設定ファイルの解析に失敗しました: ${originalError.message}`,
      filePath
    );
  }

  static createTypeScriptParseError(filePath: string, originalError: Error): ParseError {
    return new ParseError(
      `TypeScriptファイルの解析に失敗しました: ${originalError.message}`,
      filePath
    );
  }
}