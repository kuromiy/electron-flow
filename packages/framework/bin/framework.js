#!/usr/bin/env node

const { Command } = require('commander');
const { build, watch } = require('../dist/index.js');
const path = require('path');
const fs = require('fs');

const program = new Command();

program
  .name('electron-flow-framework')
  .description('Electron IPC自動生成フレームワーク')
  .version('0.1.0');

// Build command
program
  .command('build')
  .description('IPC bridgeコードを生成')
  .option('-c, --config <path>', '設定ファイルのパス', './electron-flow.config.js')
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);
      const result = await build(config);
      console.log('✅ Build completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  });

// Watch command
program
  .command('watch')
  .description('ファイル変更を監視してIPC bridgeコードを自動生成')
  .option('-c, --config <path>', '設定ファイルのパス', './electron-flow.config.js')
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);
      await watch(config);
    } catch (error) {
      console.error('❌ Watch failed:', error.message);
      process.exit(1);
    }
  });

function loadConfig(configPath) {
  const fullPath = path.resolve(process.cwd(), configPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Config file not found: ${fullPath}`);
  }
  
  try {
    // Clear require cache
    delete require.cache[require.resolve(fullPath)];
    const config = require(fullPath);
    
    // Handle both default export and module.exports
    return config.default || config;
  } catch (error) {
    throw new Error(`Failed to load config file: ${error.message}`);
  }
}

program.parse(process.argv);
