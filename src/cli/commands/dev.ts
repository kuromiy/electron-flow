import type { DevOptions } from '../types';
import { loadConfig } from '../config-loader';
import { ElectronFlowError } from '../error-handler';

/**
 * ホットリロード付き開発サーバーを開始する
 */
export async function dev(options: DevOptions): Promise<void> {
  console.log('開発サーバーを開始しています...');
  
  try {
    await loadConfig(options.config || 'electron-flow.config.ts');
    console.log(`設定を読み込みました: ${options.config || 'electron-flow.config.ts'}`);
    
    // TODO: 開発サーバーを実装
    throw new ElectronFlowError(
      'devコマンドはまだ実装されていません',
      'NOT_IMPLEMENTED'
    );
  } catch (error) {
    if (error instanceof ElectronFlowError) {
      throw error;
    }
    throw new ElectronFlowError(
      `開発サーバーの開始に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      'DEV_FAILED'
    );
  }
}