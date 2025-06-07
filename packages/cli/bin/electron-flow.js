#!/usr/bin/env node

const { Command } = require('commander');
const { dev, build, packageApp, loadConfig, validateConfig } = require('../dist/index.js');

const program = new Command();

program
  .name('electron-flow')
  .description('Electronアプリケーション開発・ビルド・パッケージングCLI')
  .version('0.1.0');

// Dev command
program
  .command('dev')
  .description('開発サーバーを起動')
  .option('-c, --config <path>', '設定ファイルのパス')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      validateConfig(config);
      await dev(config);
    } catch (error) {
      console.error('❌ Dev command failed:', error.message);
      process.exit(1);
    }
  });

// Build command
program
  .command('build')
  .description('プロダクション用ビルドを実行')
  .option('-c, --config <path>', '設定ファイルのパス')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      validateConfig(config);
      await build(config);
    } catch (error) {
      console.error('❌ Build command failed:', error.message);
      process.exit(1);
    }
  });

// Package command
program
  .command('package')
  .description('Electronアプリケーションをパッケージング')
  .option('-c, --config <path>', '設定ファイルのパス')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      validateConfig(config);
      await packageApp(config);
    } catch (error) {
      console.error('❌ Package command failed:', error.message);
      process.exit(1);
    }
  });

// Framework command - proxy to framework CLI
program
  .command('framework <command>')
  .description('IPC自動生成フレームワークコマンド')
  .allowUnknownOption()
  .action((command, options, cmd) => {
    const { spawn } = require('child_process');
    
    // frameworkコマンドにプロキシ
    const args = [command, ...cmd.parent.rawArgs.slice(cmd.parent.rawArgs.indexOf('framework') + 2)];
    const frameworkCLI = spawn('electron-flow-framework', args, {
      stdio: 'inherit'
    });
    
    frameworkCLI.on('close', (code) => {
      process.exit(code || 0);
    });
    
    frameworkCLI.on('error', (error) => {
      console.error('❌ Framework command failed:', error.message);
      process.exit(1);
    });
  });

program.parse(process.argv);
