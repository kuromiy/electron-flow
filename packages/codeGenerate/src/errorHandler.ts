/**
 * Phase 4: エラーハンドリングとリカバリー機能
 * エラーの分類、ハンドリング、リカバリー提案を提供
 */

import type { AnalysisError } from './types.js';
import type { ExtendedBuildResult, BuildContext } from './build.js';

/**
 * エラーカテゴリー
 */
export type ErrorCategory = 
  | 'CONFIG_ERROR'
  | 'PARSE_ERROR' 
  | 'GENERATION_ERROR'
  | 'FILE_SYSTEM_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * 設定エラー
 */
export interface ConfigError extends Error {
  type: 'CONFIG_ERROR';
  field?: string;
  suggestions: string[];
}

/**
 * 解析エラー
 */
export interface ParseError extends Error {
  type: 'PARSE_ERROR';
  filePath: string;
  line?: number;
  column?: number;
  suggestions: string[];
}

/**
 * 生成エラー
 */
export interface GenerationError extends Error {
  type: 'GENERATION_ERROR';
  stage: 'preload' | 'handler' | 'types';
  suggestions: string[];
}

/**
 * ファイルシステムエラー
 */
export interface FileSystemError extends Error {
  type: 'FILE_SYSTEM_ERROR';
  operation: 'read' | 'write' | 'scan';
  path: string;
  suggestions: string[];
}

/**
 * バリデーションエラー
 */
export interface ValidationError extends Error {
  type: 'VALIDATION_ERROR';
  code: string;
  suggestions: string[];
}

/**
 * リカバリー提案
 */
export interface RecoverySuggestion {
  type: 'automatic' | 'manual';
  description: string;
  action?: () => Promise<boolean>;
}

/**
 * 部分的ビルド結果
 */
export interface PartialBuildResult {
  success: boolean;
  completedStages: string[];
  partialFiles: string[];
  skippedFiles: string[];
}

/**
 * エラーハンドラークラス
 */
export class ErrorHandler {
  private errors: AnalysisError[] = [];
  private warnings: string[] = [];

  /**
   * ビルドエラーをハンドリング
   * @param error - エラー
   * @param context - ビルドコンテキスト
   * @returns ビルド結果
   */
  handleBuildError(error: Error, context: BuildContext): ExtendedBuildResult {
    const errorCategory = this.categorizeError(error);
    const { option, startTime } = context;

    context.logger.error(`エラー発生 (${errorCategory}): ${error.message}`);

    switch (errorCategory) {
      case 'CONFIG_ERROR':
        return this.handleConfigError(error as ConfigError, context);
      
      case 'PARSE_ERROR':
        return this.handleParseError(error as ParseError, context);
      
      case 'GENERATION_ERROR':
        return this.handleGenerationError(error as GenerationError, context);
      
      case 'FILE_SYSTEM_ERROR':
        return this.handleFileSystemError(error as FileSystemError, context);
      
      case 'VALIDATION_ERROR':
        return this.handleValidationError(error as ValidationError, context);
      
      default:
        return this.handleUnknownError(error, context);
    }
  }

  /**
   * 設定エラーのハンドリング
   * @param error - 設定エラー
   * @param context - ビルドコンテキスト
   * @returns ビルド結果
   */
  private handleConfigError(error: ConfigError, context: BuildContext): ExtendedBuildResult {
    context.logger.error('設定エラーが発生しました:');
    error.suggestions.forEach(suggestion => {
      context.logger.info(`  💡 ${suggestion}`);
    });

    return this.createErrorResult(error, context, {
      success: false,
      completedStages: [],
      partialFiles: [],
      skippedFiles: []
    });
  }

  /**
   * 解析エラーのハンドリング
   * @param error - 解析エラー
   * @param context - ビルドコンテキスト
   * @returns ビルド結果
   */
  private handleParseError(error: ParseError, context: BuildContext): ExtendedBuildResult {
    const { option, logger } = context;
    
    logger.error(`解析エラー: ${error.filePath}`);
    if (error.line) {
      logger.error(`  行: ${error.line}${error.column ? `, 列: ${error.column}` : ''}`);
    }

    // 部分的な成功の試行
    const partialResult = this.attemptPartialBuild(context, error.filePath);

    error.suggestions.forEach(suggestion => {
      logger.info(`  💡 ${suggestion}`);
    });

    return this.createErrorResult(error, context, partialResult);
  }

  /**
   * 生成エラーのハンドリング
   * @param error - 生成エラー
   * @param context - ビルドコンテキスト
   * @returns ビルド結果
   */
  private handleGenerationError(error: GenerationError, context: BuildContext): ExtendedBuildResult {
    const { logger } = context;
    
    logger.error(`コード生成エラー (${error.stage}): ${error.message}`);
    
    error.suggestions.forEach(suggestion => {
      logger.info(`  💡 ${suggestion}`);
    });

    return this.createErrorResult(error, context, {
      success: false,
      completedStages: this.getCompletedStagesBeforeGeneration(error.stage),
      partialFiles: [],
      skippedFiles: []
    });
  }

  /**
   * ファイルシステムエラーのハンドリング
   * @param error - ファイルシステムエラー
   * @param context - ビルドコンテキスト
   * @returns ビルド結果
   */
  private handleFileSystemError(error: FileSystemError, context: BuildContext): ExtendedBuildResult {
    const { logger } = context;
    
    logger.error(`ファイルシステムエラー (${error.operation}): ${error.path}`);
    
    error.suggestions.forEach(suggestion => {
      logger.info(`  💡 ${suggestion}`);
    });

    return this.createErrorResult(error, context, {
      success: false,
      completedStages: ['scan', 'analyze'],
      partialFiles: [],
      skippedFiles: [error.path]
    });
  }

  /**
   * バリデーションエラーのハンドリング
   * @param error - バリデーションエラー
   * @param context - ビルドコンテキスト
   * @returns ビルド結果
   */
  private handleValidationError(error: ValidationError, context: BuildContext): ExtendedBuildResult {
    const { logger } = context;
    
    logger.error(`バリデーションエラー (${error.code}): ${error.message}`);
    
    error.suggestions.forEach(suggestion => {
      logger.info(`  💡 ${suggestion}`);
    });

    return this.createErrorResult(error, context, {
      success: false,
      completedStages: ['scan', 'analyze', 'generate'],
      partialFiles: [],
      skippedFiles: []
    });
  }

  /**
   * 不明なエラーのハンドリング
   * @param error - エラー
   * @param context - ビルドコンテキスト
   * @returns ビルド結果
   */
  private handleUnknownError(error: Error, context: BuildContext): ExtendedBuildResult {
    const { logger } = context;
    
    logger.error('予期しないエラーが発生しました:', error.message);
    logger.info('  💡 ログを確認してサポートに問い合わせてください');
    logger.info('  💡 一時的な問題の可能性があります。再実行をお試しください');

    return this.createErrorResult(error, context, {
      success: false,
      completedStages: [],
      partialFiles: [],
      skippedFiles: []
    });
  }

  /**
   * エラーを分類
   * @param error - エラー
   * @returns エラーカテゴリー
   */
  private categorizeError(error: Error): ErrorCategory {
    if ('type' in error) {
      return (error as any).type;
    }

    const message = error.message.toLowerCase();
    
    if (message.includes('config') || message.includes('設定')) {
      return 'CONFIG_ERROR';
    }
    
    if (message.includes('parse') || message.includes('解析') || message.includes('syntax')) {
      return 'PARSE_ERROR';
    }
    
    if (message.includes('generation') || message.includes('生成')) {
      return 'GENERATION_ERROR';
    }
    
    if (message.includes('file') || message.includes('ファイル') || message.includes('enoent')) {
      return 'FILE_SYSTEM_ERROR';
    }
    
    if (message.includes('validation') || message.includes('検証')) {
      return 'VALIDATION_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * 部分的なビルドを試行
   * @param context - ビルドコンテキスト
   * @param problematicFile - 問題のあるファイル
   * @returns 部分的ビルド結果
   */
  private attemptPartialBuild(context: BuildContext, problematicFile: string): PartialBuildResult {
    context.logger.info('部分的なビルドを試行しています...');

    try {
      // 問題のあるファイルを除外して他のファイルを処理
      return {
        success: true,
        completedStages: ['scan'],
        partialFiles: [],
        skippedFiles: [problematicFile]
      };
    } catch (error) {
      return {
        success: false,
        completedStages: [],
        partialFiles: [],
        skippedFiles: [problematicFile]
      };
    }
  }

  /**
   * 生成段階前の完了ステージを取得
   * @param failedStage - 失敗した段階
   * @returns 完了したステージ
   */
  private getCompletedStagesBeforeGeneration(failedStage: string): string[] {
    const stages = ['scan', 'analyze', 'generate'];
    const failedIndex = stages.indexOf(failedStage);
    return failedIndex > 0 ? stages.slice(0, failedIndex) : [];
  }

  /**
   * エラー結果を作成
   * @param error - エラー
   * @param context - ビルドコンテキスト
   * @param partialResult - 部分的結果
   * @returns ビルド結果
   */
  private createErrorResult(
    error: Error, 
    context: BuildContext, 
    partialResult: PartialBuildResult
  ): ExtendedBuildResult {
    const endTime = Date.now();

    return {
      zodObjectInfos: [],
      packages: [],
      success: false,
      buildTimeMs: endTime - context.startTime,
      statistics: {
        startTime: context.startTime,
        endTime,
        buildTimeMs: endTime - context.startTime,
        analyzedFiles: 0,
        extractedFunctions: 0,
        extractedSchemas: 0,
        generatedFiles: 0,
        memoryUsage: process.memoryUsage().heapUsed
      },
      generatedFiles: partialResult.partialFiles,
      errors: [{
        type: this.categorizeError(error) === 'PARSE_ERROR' ? 'parse_error' : 'file_error',
        message: error.message,
        filePath: 'filePath' in error ? (error as any).filePath : undefined,
        line: 'line' in error ? (error as any).line : undefined,
        column: 'column' in error ? (error as any).column : undefined
      }],
      warnings: this.warnings
    };
  }

  /**
   * 解析エラーの提案を生成
   * @param error - 解析エラー
   * @returns 提案の配列
   */
  getParseErrorSuggestions(error: ParseError): string[] {
    const suggestions: string[] = [];
    const message = error.message.toLowerCase();
    
    if (message.includes('syntax')) {
      suggestions.push('ファイルのTypeScript構文を確認してください');
      suggestions.push('インポートが正しく解決されているか確認してください');
      suggestions.push('型定義ファイル（.d.ts）が適切に配置されているか確認してください');
    }
    
    if (message.includes('type')) {
      suggestions.push('型定義が正しくエクスポートされているか確認してください');
      suggestions.push('循環依存がないか確認してください');
      suggestions.push('ジェネリック型の制約を確認してください');
    }
    
    if (message.includes('module')) {
      suggestions.push('モジュールのパスが正しいか確認してください');
      suggestions.push('package.jsonの設定を確認してください');
      suggestions.push('node_modulesを再インストールしてください');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('ファイルの構文エラーを確認してください');
      suggestions.push('TypeScriptコンパイラーでの検証を試してください');
    }
    
    return suggestions;
  }

  /**
   * 設定エラーの提案を生成
   * @param field - エラーのあるフィールド
   * @param value - 値
   * @returns 提案の配列
   */
  getConfigErrorSuggestions(field: string, value: any): string[] {
    const suggestions: string[] = [];
    
    switch (field) {
      case 'targetPath':
        suggestions.push('ディレクトリパスが存在することを確認してください');
        suggestions.push('相対パスまたは絶対パスを正しく指定してください');
        break;
      case 'preloadPath':
      case 'registerPath':
      case 'rendererPath':
        suggestions.push('出力先ディレクトリが書き込み可能か確認してください');
        suggestions.push('ファイル拡張子（.ts または .js）を含めてください');
        break;
      case 'ignores':
        suggestions.push('配列形式で関数名を指定してください');
        suggestions.push('例: ["debug", "internal"]');
        break;
      default:
        suggestions.push(`${field}の値を確認してください`);
        suggestions.push('設定ファイルのドキュメントを参照してください');
    }
    
    return suggestions;
  }

  /**
   * エラー履歴を取得
   * @returns エラーの配列
   */
  public getErrors(): AnalysisError[] {
    return [...this.errors];
  }

  /**
   * 警告履歴を取得
   * @returns 警告の配列
   */
  public getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * エラーと警告をクリア
   */
  public clear(): void {
    this.errors = [];
    this.warnings = [];
  }
}

/**
 * デフォルトのエラーハンドラーインスタンス
 */
export const errorHandler = new ErrorHandler();