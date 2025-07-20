/**
 * Phase 4: 設定管理システム
 * 設定ファイルの読み込み、検証、正規化を行う
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AutoCodeOption } from './index.js';

/**
 * 拡張された設定オプション
 */
export interface ExtendedAutoCodeOption extends AutoCodeOption {
  /** 高度な設定オプション */
  advanced?: AdvancedOptions;
  /** ログレベル設定 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 高度な設定オプション
 */
export interface AdvancedOptions {
  /** 並列処理の同時実行数 */
  concurrency?: number;
  /** ファイル書き込み時にバックアップを作成するか */
  createBackup?: boolean;
  /** 生成されたファイルにタイムスタンプを含めるか */
  includeTimestamp?: boolean;
  /** 詳細ログを出力するか */
  verbose?: boolean;
  /** 除外するファイルパターン */
  excludePatterns?: string[];
  /** 最大ファイルサイズ（バイト） */
  maxFileSize?: number;
}

/**
 * 設定検証エラー
 */
export interface ConfigValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * 設定検証結果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: string[];
}

/**
 * ファイル書き込みオプション
 */
export interface WriteOptions {
  /** バックアップを作成するか */
  createBackup?: boolean;
  /** ファイルが存在しない場合のみ書き込むか */
  onlyIfNotExists?: boolean;
}

/**
 * 設定管理クラス
 */
export class ConfigManager {
  private errors: ConfigValidationError[] = [];
  private warnings: string[] = [];

  /**
   * 設定ファイルを読み込み
   * @param configPath - 設定ファイルのパス
   * @returns 正規化された設定オプション
   */
  async loadConfig(configPath: string): Promise<ExtendedAutoCodeOption> {
    try {
      const absolutePath = path.resolve(configPath);
      
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`設定ファイルが見つかりません: ${absolutePath}`);
      }

      // 動的インポートで設定ファイルを読み込み
      const configModule = await import(absolutePath);
      const config = configModule.autoCodeOption || configModule.default;
      
      if (!config) {
        throw new Error('設定ファイルにautoCodeOptionが見つかりません');
      }

      // 設定を検証して正規化
      return this.validateAndNormalize(config);
    } catch (error) {
      throw new Error(`設定ファイル読み込みエラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 設定の検証と正規化
   * @param config - 生の設定オブジェクト
   * @returns 正規化された設定オプション
   */
  private validateAndNormalize(config: any): ExtendedAutoCodeOption {
    this.errors = [];
    this.warnings = [];

    // 必須フィールドの検証
    this.validateRequiredFields(config);
    
    if (this.errors.length > 0) {
      const errorMessages = this.errors.map(e => `${e.field}: ${e.message}`).join('\n');
      throw new Error(`設定検証エラー:\n${errorMessages}`);
    }

    // パスの正規化
    const normalized: ExtendedAutoCodeOption = {
      ...config,
      targetPath: path.resolve(config.targetPath),
      preloadPath: path.resolve(config.preloadPath),
      registerPath: path.resolve(config.registerPath),
      rendererPath: path.resolve(config.rendererPath),
      contextPath: config.contextPath ? path.resolve(config.contextPath) : undefined
    };

    // デフォルト値の適用
    return this.applyDefaults(normalized);
  }

  /**
   * 必須フィールドの検証
   * @param config - 設定オブジェクト
   */
  private validateRequiredFields(config: any): void {
    const requiredFields = ['targetPath', 'preloadPath', 'registerPath', 'rendererPath'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        this.addError(field, '必須フィールドです');
      } else if (typeof config[field] !== 'string') {
        this.addError(field, '文字列である必要があります', config[field]);
      }
    }

    // ignoresフィールドの検証
    if (config.ignores !== undefined) {
      if (!Array.isArray(config.ignores)) {
        this.addError('ignores', '配列である必要があります', config.ignores);
      } else if (!config.ignores.every((item: any) => typeof item === 'string')) {
        this.addError('ignores', 'すべての要素が文字列である必要があります', config.ignores);
      }
    }

    // パスの存在確認
    if (config.targetPath && typeof config.targetPath === 'string') {
      const targetPath = path.resolve(config.targetPath);
      if (!fs.existsSync(targetPath)) {
        this.addError('targetPath', 'ディレクトリが存在しません', targetPath);
      } else if (!fs.statSync(targetPath).isDirectory()) {
        this.addError('targetPath', 'ディレクトリではありません', targetPath);
      }
    }
  }

  /**
   * デフォルト値の適用
   * @param config - 正規化された設定
   * @returns デフォルト値が適用された設定
   */
  private applyDefaults(config: ExtendedAutoCodeOption): ExtendedAutoCodeOption {
    return {
      ...config,
      ignores: config.ignores || [],
      logLevel: config.logLevel || 'info',
      advanced: {
        concurrency: 4,
        createBackup: false,
        includeTimestamp: true,
        verbose: false,
        excludePatterns: ['**/*.d.ts', '**/__tests__/**', '**/node_modules/**'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        ...config.advanced
      }
    };
  }

  /**
   * エラーを追加
   * @param field - フィールド名
   * @param message - エラーメッセージ
   * @param value - 値
   */
  private addError(field: string, message: string, value?: any): void {
    this.errors.push({ field, message, value });
  }

  /**
   * 警告を追加
   * @param message - 警告メッセージ
   */
  private addWarning(message: string): void {
    this.warnings.push(message);
  }

  /**
   * 設定検証結果を取得
   * @returns 検証結果
   */
  public getValidationResult(): ConfigValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  /**
   * 設定のサマリーを表示
   * @param config - 設定オプション
   */
  public logConfigSummary(config: ExtendedAutoCodeOption): void {
    console.log('=== 設定サマリー ===');
    console.log(`Target Path: ${config.targetPath}`);
    console.log(`Preload Path: ${config.preloadPath}`);
    console.log(`Register Path: ${config.registerPath}`);
    console.log(`Renderer Path: ${config.rendererPath}`);
    if (config.contextPath) {
      console.log(`Context Path: ${config.contextPath}`);
    }
    console.log(`Ignores: ${config.ignores.length} items`);
    console.log(`Log Level: ${config.logLevel}`);
    if (config.advanced?.verbose) {
      console.log('Advanced Options:', config.advanced);
    }
    console.log('==================');
  }
}

/**
 * 設定ファイルを読み込み（便利関数）
 * @param configPath - 設定ファイルのパス
 * @returns 正規化された設定オプション
 */
export async function loadConfig(configPath: string): Promise<ExtendedAutoCodeOption> {
  const manager = new ConfigManager();
  return manager.loadConfig(configPath);
}

/**
 * 設定を検証（便利関数）
 * @param config - 設定オプション
 * @returns 検証結果
 */
export function validateConfig(config: any): ConfigValidationResult {
  const manager = new ConfigManager();
  try {
    manager['validateAndNormalize'](config);
    return manager.getValidationResult();
  } catch (error) {
    return {
      isValid: false,
      errors: manager.getValidationResult().errors,
      warnings: manager.getValidationResult().warnings
    };
  }
}