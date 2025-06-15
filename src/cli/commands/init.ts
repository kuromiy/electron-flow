import type { InitOptions } from '../types';
import { ElectronFlowError } from '../error-handler';

/**
 * 新しいelectron-flowプロジェクトを初期化する
 */
export async function init(options: InitOptions): Promise<void> {
  console.log('electron-flowプロジェクトを初期化しています...');
  
  if (options.force) {
    console.log('強制モードが有効 - 既存ファイルを上書きします');
  }
  
  // TODO: プロジェクト初期化を実装
  throw new ElectronFlowError(
    'initコマンドはまだ実装されていません',
    'NOT_IMPLEMENTED'
  );
}