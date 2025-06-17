import type { InitOptions } from '../types';
import { ElectronFlowError } from '../error-handler';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
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
    cyan: (s: string) => s 
  };
  ora = () => ({ start: () => ({ text: '', succeed: () => {}, fail: () => {} }) });
}

/**
 * 新しいelectron-flowプロジェクトを初期化する
 */
export async function init(options: InitOptions): Promise<void> {
  const spinner = ora('electron-flowプロジェクトを初期化しています...').start();
  
  try {
    const configPath = 'electron-flow.config.ts';
    
    // 設定ファイルが既に存在するか確認
    if (existsSync(configPath) && !options.force) {
      spinner.fail('設定ファイルが既に存在します');
      console.log(chalk.yellow('\n上書きするには --force オプションを使用してください'));
      throw new ElectronFlowError(
        '設定ファイルが既に存在します',
        'CONFIG_EXISTS'
      );
    }
    
    // デフォルトの設定内容
    const configContent = `import type { ElectronFlowConfig } from 'electron-flow';

const config: ElectronFlowConfig = {
  // ハンドラー関数が格納されているディレクトリ
  handlersDir: './src/main/handlers',
  
  // 生成されたコードの出力先
  outDir: './src/generated',
  
  // Context型の定義ファイルパス
  contextPath: './src/main/context.ts',
  
  // エラーハンドラーの定義ファイルパス
  errorHandlerPath: './src/main/error-handler.ts',
  
  // 開発サーバー設定（オプション）
  dev: {
    enabled: true,
    port: 3000,
  },
  
  // コード生成オプション
  generation: {
    useStrict: true,
    emitComments: true,
  },
};

export default config;
`;
    
    // 設定ファイルを書き込む
    await writeFile(configPath, configContent, 'utf-8');
    
    // サンプルディレクトリ構造を作成
    const directories = [
      'src/main/handlers',
      'src/generated',
      'src/main',
      'src/renderer',
    ];
    
    for (const dir of directories) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
    
    // Context型のサンプルを作成
    const contextContent = `import type { IpcMainInvokeEvent } from 'electron';

export interface Context {
  // IPCイベントオブジェクト
  event?: IpcMainInvokeEvent;
  
  // アプリケーション固有のコンテキスト情報をここに追加
  // 例: userId, sessionId, permissionsなど
}
`;
    
    const contextPath = join('src/main', 'context.ts');
    if (!existsSync(contextPath) || options.force) {
      await writeFile(contextPath, contextContent, 'utf-8');
    }
    
    // エラーハンドラーのサンプルを作成
    const errorHandlerContent = `import type { Context } from './context';
import { failure, type ErrorValue } from 'electron-flow';

/**
 * IPCハンドラー内で発生したエラーを処理する
 */
export function handleError(context: Context, error: unknown) {
  console.error('IPCエラー:', error);
  
  // エラーをErrorValue形式に変換
  const errorValue: ErrorValue = {
    path: '',
    messages: [error instanceof Error ? error.message : '不明なエラーが発生しました'],
  };
  
  return failure([errorValue]);
}
`;
    
    const errorHandlerPath = join('src/main', 'error-handler.ts');
    if (!existsSync(errorHandlerPath) || options.force) {
      await writeFile(errorHandlerPath, errorHandlerContent, 'utf-8');
    }
    
    // サンプルハンドラーを作成
    const sampleHandlerContent = `import type { Context } from '../context';
import { success, failure, type Result, type ErrorValue } from 'electron-flow';

/**
 * サンプルハンドラー - 二つの数値を加算する
 * @param a 最初の数値
 * @param b 二つ目の数値
 * @returns 加算結果
 */
export async function add(context: Context, a: number, b: number): Promise<Result<number>> {
  // バリデーション
  const errors: ErrorValue[] = [];
  
  if (typeof a !== 'number') {
    errors.push({
      path: 'a',
      messages: ['数値を指定してください'],
    });
  }
  
  if (typeof b !== 'number') {
    errors.push({
      path: 'b',
      messages: ['数値を指定してください'],
    });
  }
  
  if (errors.length > 0) {
    return failure(errors);
  }
  
  // ビジネスロジック
  return success(a + b);
}

/**
 * サンプルハンドラー - 現在の日時を取得する
 * @returns 現在の日時文字列
 */
export async function getCurrentTime(context: Context): Promise<Result<string>> {
  return success(new Date().toISOString());
}
`;
    
    const sampleHandlerPath = join('src/main/handlers', 'sample.ts');
    if (!existsSync(sampleHandlerPath) || options.force) {
      await writeFile(sampleHandlerPath, sampleHandlerContent, 'utf-8');
    }
    
    spinner.succeed('electron-flowプロジェクトの初期化が完了しました');
    
    console.log('\n作成されたファイル:');
    console.log(chalk.green('✓'), chalk.gray('electron-flow.config.ts'));
    console.log(chalk.green('✓'), chalk.gray('src/main/context.ts'));
    console.log(chalk.green('✓'), chalk.gray('src/main/error-handler.ts'));
    console.log(chalk.green('✓'), chalk.gray('src/main/handlers/sample.ts'));
    
    console.log('\n次のステップ:');
    console.log(chalk.cyan('1.'), '設定ファイルを編集してプロジェクトに合わせてください');
    console.log(chalk.cyan('2.'), `${chalk.yellow('npx electron-flow generate')} を実行してIPCコードを生成します`);
    console.log(chalk.cyan('3.'), '生成されたコードをElectronアプリケーションで使用します');
  } catch (error) {
    spinner.fail('初期化に失敗しました');
    
    if (error instanceof ElectronFlowError) {
      throw error;
    }
    throw new ElectronFlowError(
      `初期化に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      'INIT_FAILED'
    );
  }
}