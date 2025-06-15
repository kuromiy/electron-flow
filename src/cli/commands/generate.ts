import type { GenerateOptions } from '../types';
import { loadConfig } from '../config-loader';
import { ElectronFlowError } from '../error-handler';
import { Parser, Generator } from '../../generator';
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
  chalk = { green: (s: string) => s, gray: (s: string) => s };
  ora = () => ({ start: () => ({ text: '', succeed: () => {}, fail: () => {}, warn: () => {} }) });
}

/**
 * ハンドラー関数からIPCコードを生成する
 */
export async function generate(options: GenerateOptions): Promise<void> {
  const spinner = ora('IPCコードを生成しています...').start();
  
  try {
    // 設定を読み込む
    const config = await loadConfig(options.config || 'electron-flow.config.ts');
    spinner.text = `設定を読み込みました: ${options.config || 'electron-flow.config.ts'}`;
    
    // ハンドラーを解析
    spinner.text = 'ハンドラーを解析しています...';
    const parser = new Parser();
    const handlers = await parser.parseHandlers(config.handlersDir);
    
    if (handlers.length === 0) {
      spinner.warn('ハンドラーが見つかりませんでした');
      return;
    }
    
    spinner.text = `${handlers.length}個のハンドラーを見つけました`;
    
    // コードを生成
    const generator = new Generator();
    const targets: Array<'main' | 'preload' | 'renderer'> = ['main', 'preload', 'renderer'];
    const generatedFiles: Array<{ path: string; content: string }> = [];
    
    for (const target of targets) {
      spinner.text = `${target}プロセス用のコードを生成しています...`;
      const code = await generator.generateCode(handlers, target, config);
      
      const fileName = target === 'main' ? 'ipc-main.ts' : 
                      target === 'preload' ? 'ipc-preload.ts' : 'ipc-renderer.ts';
      const filePath = join(config.outDir, fileName);
      
      generatedFiles.push({ path: filePath, content: code.code });
    }
    
    // ファイルを書き込む（ドライランモードでない場合）
    if (options.dryRun) {
      spinner.succeed('ドライランモード - ファイルは書き込まれません');
      console.log('\n生成されるファイル:');
      for (const file of generatedFiles) {
        console.log(chalk.green('✓'), chalk.gray(file.path));
      }
    } else {
      // 出力ディレクトリを作成
      if (!existsSync(config.outDir)) {
        await mkdir(config.outDir, { recursive: true });
      }
      
      // ファイルを書き込む
      for (const file of generatedFiles) {
        await writeFile(file.path, file.content, 'utf-8');
      }
      
      spinner.succeed('IPCコードの生成が完了しました');
      console.log('\n生成されたファイル:');
      for (const file of generatedFiles) {
        console.log(chalk.green('✓'), chalk.gray(file.path));
      }
    }
  } catch (error) {
    spinner.fail('コード生成に失敗しました');
    
    if (error instanceof ElectronFlowError) {
      throw error;
    }
    throw new ElectronFlowError(
      `コード生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      'GENERATION_FAILED'
    );
  }
}