#!/usr/bin/env node

// Phase 5で実装予定: CLI エントリーポイント

import { Command } from 'commander';

const program = new Command();

program
  .name('electron-flow')
  .description(
    'TypeScript APIから自動でIPC通信コードを生成するElectronアプリケーション開発用ツール'
  )
  .version('0.0.1');

// initコマンド - Phase 5で実装予定
program
  .command('init')
  .description('プロジェクトの初期化と設定ファイルの生成')
  .action(() => {
    throw new Error(
      'init command: Not implemented yet - will be implemented in Phase 5'
    );
  });

// genコマンド - Phase 5で実装予定
program
  .command('gen')
  .description('IPC通信コードの生成')
  .action(() => {
    throw new Error(
      'gen command: Not implemented yet - will be implemented in Phase 5'
    );
  });

program.parse();
