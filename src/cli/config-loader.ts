import { promises as fs } from 'fs';
import path from 'path';
import type { ElectronFlowConfig } from './types';

/**
 * ファイルから設定を読み込む
 */
export async function loadConfig(configPath: string): Promise<ElectronFlowConfig> {
  const absolutePath = path.resolve(configPath);

  // ファイルの存在確認
  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`設定ファイルが見つかりません: ${configPath}`);
  }

  // 設定モジュールを読み込む
  try {
    // TypeScript/ESMサポートのための動的インポート
    const configModule = await import(absolutePath);
    
    if (!configModule.default) {
      throw new Error('設定ファイルはデフォルトエクスポートが必要です');
    }

    const config = configModule.default as ElectronFlowConfig;
    validateConfig(config);
    
    return config;
  } catch (error) {
    if (error instanceof Error && error.message.includes('設定ファイルはデフォルトエクスポートが必要です')) {
      throw error;
    }
    throw new Error(`設定の読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}

/**
 * 設定オブジェクトを検証する
 */
export function validateConfig(config: unknown): asserts config is ElectronFlowConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('設定はオブジェクトである必要があります');
  }

  const cfg = config as Record<string, unknown>;

  // 必須フィールドを検証
  if (typeof cfg.handlersDir !== 'string') {
    throw new Error('handlersDirは文字列である必要があります');
  }
  if (typeof cfg.outDir !== 'string') {
    throw new Error('outDirは文字列である必要があります');
  }
  if (typeof cfg.contextPath !== 'string') {
    throw new Error('contextPathは文字列である必要があります');
  }
  if (typeof cfg.errorHandlerPath !== 'string') {
    throw new Error('errorHandlerPathは文字列である必要があります');
  }

  // オプションのdev設定を検証
  if (cfg.dev !== undefined) {
    if (typeof cfg.dev !== 'object' || cfg.dev === null) {
      throw new Error('devはオブジェクトである必要があります');
    }

    const dev = cfg.dev as Record<string, unknown>;
    
    if (dev.electronEntry !== undefined && typeof dev.electronEntry !== 'string') {
      throw new Error('dev.electronEntryは文字列である必要があります');
    }
    if (dev.preloadEntry !== undefined && typeof dev.preloadEntry !== 'string') {
      throw new Error('dev.preloadEntryは文字列である必要があります');
    }
    if (dev.viteConfig !== undefined && typeof dev.viteConfig !== 'string') {
      throw new Error('dev.viteConfigは文字列である必要があります');
    }
    if (dev.watchPaths !== undefined) {
      if (!Array.isArray(dev.watchPaths) || !dev.watchPaths.every(p => typeof p === 'string')) {
        throw new Error('dev.watchPathsは文字列の配列である必要があります');
      }
    }
  }

  // オプションのgeneration設定を検証
  if (cfg.generation !== undefined) {
    if (typeof cfg.generation !== 'object' || cfg.generation === null) {
      throw new Error('generationはオブジェクトである必要があります');
    }

    const gen = cfg.generation as Record<string, unknown>;
    
    if (gen.apiStructure !== undefined) {
      if (gen.apiStructure !== 'file' && gen.apiStructure !== 'flat') {
        throw new Error('generation.apiStructureは "file" または "flat" である必要があります');
      }
    }
    if (gen.prettier !== undefined && typeof gen.prettier !== 'boolean') {
      throw new Error('generation.prettierはブール値である必要があります');
    }
    if (gen.prettierConfig !== undefined && typeof gen.prettierConfig !== 'string') {
      throw new Error('generation.prettierConfigは文字列である必要があります');
    }
  }
}