// Phase 4で実装予定: ビルドプロセス管理

import type { AutoCodeOption, BuildResult } from './index.js';

/**
 * 全体のビルドプロセスを管理
 * Phase 4で実装予定
 */
export class BuildManager {
  async build(_option: AutoCodeOption): Promise<BuildResult> {
    throw new Error(
      'BuildManager.build: Not implemented yet - will be implemented in Phase 4'
    );
  }

  async generateFiles(
    _result: BuildResult,
    _option: AutoCodeOption
  ): Promise<void> {
    throw new Error(
      'BuildManager.generateFiles: Not implemented yet - will be implemented in Phase 4'
    );
  }
}
