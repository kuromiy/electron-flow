// Phase 6で実装予定: ファイル監視機能

import type { AutoCodeOption } from './index.js';

/**
 * ファイル変更を監視して自動ビルドを実行
 * Phase 6で実装予定
 */
export class FileWatcher {
  async startWatching(_option: AutoCodeOption): Promise<void> {
    throw new Error(
      'FileWatcher.startWatching: Not implemented yet - will be implemented in Phase 6'
    );
  }

  async stopWatching(): Promise<void> {
    throw new Error(
      'FileWatcher.stopWatching: Not implemented yet - will be implemented in Phase 6'
    );
  }
}
