/**
 * electron-flow固有のエラー用カスタムエラークラス
 */
export class ElectronFlowError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ElectronFlowError';
  }
}

/**
 * CLIエラーを処理し、適切な終了コードを返す
 */
export function handleCLIError(error: unknown): number {
  if (error instanceof ElectronFlowError) {
    if (error.code) {
      console.error(`エラー [${error.code}]: ${error.message}`);
    } else {
      console.error(`エラー: ${error.message}`);
    }
    return 1;
  }

  if (error instanceof Error) {
    console.error(`エラー: ${error.message}`);
    return 1;
  }

  if (error === null || error === undefined) {
    console.error('不明なエラーが発生しました');
    return 1;
  }

  console.error(`不明なエラー: ${String(error)}`);
  return 1;
}

/**
 * 非同期コマンド関数をエラーハンドリングでラップする
 */
export function wrapAsyncCommand<T extends unknown[]>(
  command: (...args: T) => Promise<void>
) {
  return async (...args: T): Promise<void> => {
    try {
      await command(...args);
    } catch (error) {
      const exitCode = handleCLIError(error);
      process.exit(exitCode);
    }
  };
}