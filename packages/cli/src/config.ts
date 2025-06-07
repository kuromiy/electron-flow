import { resolve, join } from "path";
import { existsSync } from "fs";
import { ElectronFlowConfig, defaultConfig } from "./types";

/**
 * 設定ファイルを読み込む
 * @param configPath - 設定ファイルのパス
 * @param cwd - 作業ディレクトリ
 * @returns 読み込まれた設定
 */
export async function loadConfig(
  configPath?: string,
  cwd: string = process.cwd()
): Promise<ElectronFlowConfig> {
  const possibleConfigFiles = [
    'electron-flow.config.js',
    'electron-flow.config.ts',
    'electron-flow.config.mjs',
    'electron-flow.config.cjs'
  ];

  let finalConfigPath: string;

  if (configPath) {
    finalConfigPath = resolve(cwd, configPath);
    if (!existsSync(finalConfigPath)) {
      throw new Error(`Config file not found: ${finalConfigPath}`);
    }
  } else {
    // 自動検出
    const foundConfig = possibleConfigFiles
      .map(file => resolve(cwd, file))
      .find(path => existsSync(path));

    if (!foundConfig) {
      throw new Error(
        `No config file found. Please create one of: ${possibleConfigFiles.join(', ')}`
      );
    }

    finalConfigPath = foundConfig;
  }

  try {
    // require キャッシュをクリア
    delete require.cache[require.resolve(finalConfigPath)];
    
    const configModule = require(finalConfigPath);
    const config = configModule.default || configModule;

    // デフォルト設定とマージ
    return mergeConfig(defaultConfig, config);
  } catch (error) {
    throw new Error(
      `Failed to load config file ${finalConfigPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * 設定をマージする
 * @param defaultConfig - デフォルト設定
 * @param userConfig - ユーザー設定
 * @returns マージされた設定
 */
function mergeConfig(
  defaultConfig: Partial<ElectronFlowConfig>,
  userConfig: ElectronFlowConfig
): ElectronFlowConfig {
  return {
    ...defaultConfig,
    ...userConfig,
    dev: {
      ...defaultConfig.dev,
      ...userConfig.dev
    }
  } as ElectronFlowConfig;
}

/**
 * Electronバイナリのパスを検出する
 * @returns Electronバイナリのパス
 */
export function findElectronPath(): string {
  const possiblePaths = [
    join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron.exe'),
    join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron'),
    join(process.cwd(), 'node_modules', '.bin', 'electron'),
    'electron'
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // フォールバック
  return 'electron';
}

/**
 * 設定の妥当性を検証する
 * @param config - 検証する設定
 */
export function validateConfig(config: ElectronFlowConfig): void {
  const requiredFields = ['framework', 'renderer', 'preload', 'main', 'packager'];
  
  for (const field of requiredFields) {
    if (!config[field as keyof ElectronFlowConfig]) {
      throw new Error(`Missing required configuration field: ${field}`);
    }
  }

  // Framework設定の検証
  const frameworkRequired = ['apiPath', 'preloadPath', 'registerPath', 'rendererTypesPath'];
  for (const field of frameworkRequired) {
    if (!config.framework[field as keyof typeof config.framework]) {
      throw new Error(`Missing required framework configuration field: ${field}`);
    }
  }
}
