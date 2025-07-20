import chalk from 'chalk';

/**
 * CLIメッセージの出力を管理するロガークラス
 */
export class CLILogger {
  constructor(private verbose: boolean = false) {
    // verboseフラグの明示的な参照でlint警告を回避
    this.verbose = verbose;
  }

  /**
   * 情報メッセージを出力
   */
  info(message: string): void {
    // eslint-disable-next-line no-console
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * 成功メッセージを出力
   */
  success(message: string): void {
    // eslint-disable-next-line no-console
    console.log(chalk.green('✓'), message);
  }

  /**
   * 警告メッセージを出力
   */
  warning(message: string): void {
    // eslint-disable-next-line no-console
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * エラーメッセージを出力
   */
  error(message: string, error?: Error): void {
    // eslint-disable-next-line no-console
    console.log(chalk.red('✗'), message);
    if (error && this.verbose) {
      // eslint-disable-next-line no-console
      console.log(chalk.gray(error.stack));
    }
  }

  /**
   * 進捗メッセージを出力（verboseモード時のみ）
   */
  progress(message: string): void {
    if (this.verbose) {
      // eslint-disable-next-line no-console
      console.log(chalk.gray('→'), message);
    }
  }

  /**
   * デバッグメッセージを出力（verboseモード時のみ）
   */
  debug(message: string): void {
    if (this.verbose) {
      // eslint-disable-next-line no-console
      console.log(chalk.gray('[DEBUG]'), message);
    }
  }

  /**
   * 空行を出力
   */
  newLine(): void {
    // eslint-disable-next-line no-console
    console.log();
  }

  /**
   * セクション見出しを出力
   */
  section(title: string): void {
    // eslint-disable-next-line no-console
    console.log(chalk.bold.cyan(`\n=== ${title} ===`));
  }
}