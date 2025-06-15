import type { GenerateOptions } from '../types';
import { loadConfig } from '../config-loader';
import { ElectronFlowError } from '../error-handler';

/**
 * ハンドラー関数からIPCコードを生成する
 */
export async function generate(options: GenerateOptions): Promise<void> {
  console.log('IPCコードを生成しています...');
  
  try {
    await loadConfig(options.config || 'electron-flow.config.ts');
    console.log(`設定を読み込みました: ${options.config || 'electron-flow.config.ts'}`);
    
    if (options.dryRun) {
      console.log('ドライランモード - ファイルは書き込まれません');
    }
    
    // TODO: コード生成を実装
    throw new ElectronFlowError(
      'generateコマンドはまだ実装されていません',
      'NOT_IMPLEMENTED'
    );
  } catch (error) {
    if (error instanceof ElectronFlowError) {
      throw error;
    }
    throw new ElectronFlowError(
      `コード生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      'GENERATION_FAILED'
    );
  }
}