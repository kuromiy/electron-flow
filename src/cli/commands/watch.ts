import type { WatchOptions } from '../types';
import { loadConfig } from '../config-loader';
import { ElectronFlowError } from '../error-handler';

/**
 * 変更を監視してIPCコードを再生成する
 */
export async function watch(options: WatchOptions): Promise<void> {
  console.log('ファイル監視を開始しています...');
  
  try {
    await loadConfig(options.config || 'electron-flow.config.ts');
    console.log(`設定を読み込みました: ${options.config || 'electron-flow.config.ts'}`);
    
    // TODO: ファイル監視を実装
    throw new ElectronFlowError(
      'watchコマンドはまだ実装されていません',
      'NOT_IMPLEMENTED'
    );
  } catch (error) {
    if (error instanceof ElectronFlowError) {
      throw error;
    }
    throw new ElectronFlowError(
      `監視の開始に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      'WATCH_FAILED'
    );
  }
}