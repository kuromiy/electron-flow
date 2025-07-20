/**
 * Phase 4: ビルドプロセス管理の完全実装
 * Phase 2-3の機能を統合し、設定に基づいた完全なビルドプロセスを構築
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parseTypeScriptFiles } from './parse.js';
import { analyzeZodSchemas } from './zod.js';
import { generatePreloadScript, generateHandlers, generateTypeDefinitions } from './format.js';
import { fileManager, type FileManager } from './fileManager.js';
import type { 
  BuildResult, 
  PackageInfo, 
  AnalysisResult,
  AnalysisError
} from './types.js';
import type { AutoCodeOption } from './index.js';
import type { ExtendedAutoCodeOption } from './config.js';

/**
 * 拡張されたビルド結果
 */
export interface ExtendedBuildResult extends BuildResult {
  /** 統計情報 */
  statistics: BuildStatistics;
  /** 生成されたファイルのパス */
  generatedFiles: string[];
  /** エラー情報 */
  errors: AnalysisError[];
  /** 警告情報 */
  warnings: string[];
}

/**
 * ビルド統計情報
 */
export interface BuildStatistics {
  /** 開始時刻 */
  startTime: number;
  /** 終了時刻 */
  endTime: number;
  /** ビルド時間（ミリ秒） */
  buildTimeMs: number;
  /** 解析したファイル数 */
  analyzedFiles: number;
  /** 発見した関数数 */
  extractedFunctions: number;
  /** 発見したZodスキーマ数 */
  extractedSchemas: number;
  /** 生成したファイル数 */
  generatedFiles: number;
  /** メモリ使用量（バイト） */
  memoryUsage: number;
}

/**
 * 生成されたコード
 */
export interface GeneratedCode {
  type: 'preload' | 'handler' | 'types';
  content: string;
  outputPath: string;
  size: number;
}

/**
 * ビルドコンテキスト
 */
export interface BuildContext {
  option: ExtendedAutoCodeOption;
  startTime: number;
  logger: Logger;
  fileManager: FileManager;
}

/**
 * シンプルなロガー
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * ビルドプロセス管理クラス
 */
export class BuildManager {
  private fileManager: FileManager;

  constructor(fileManagerInstance?: FileManager) {
    this.fileManager = fileManagerInstance || fileManager;
  }

  /**
   * メインビルド実行
   * @param option - ビルドオプション
   * @returns ビルド結果
   */
  async build(option: ExtendedAutoCodeOption): Promise<ExtendedBuildResult> {
    const startTime = Date.now();
    const logger = this.createLogger(option.logLevel);
    const context: BuildContext = {
      option,
      startTime,
      logger,
      fileManager: this.fileManager
    };

    logger.info('=== electron-flow ビルド開始 ===');

    try {
      // Phase 1: ファイル収集
      const files = await this.collectFiles(context);
      logger.info(`発見したファイル: ${files.length}個`);

      // Phase 2: 解析
      const analysisResult = await this.analyzeFiles(files, context);
      logger.info(`抽出した関数: ${analysisResult.packages.reduce((sum, pkg) => sum + pkg.functions.length, 0)}個`);
      logger.info(`抽出したZodスキーマ: ${analysisResult.zodSchemas.length}個`);

      // Phase 3: コード生成
      const generatedCode = await this.generateCode(analysisResult, context);
      logger.info(`生成したファイル: ${generatedCode.length}個`);

      // Phase 4: ファイル出力
      await this.writeGeneratedFiles(generatedCode, context);

      const endTime = Date.now();
      const statistics = this.generateStatistics(startTime, endTime, analysisResult, generatedCode);

      logger.info(`=== ビルド完了 (${statistics.buildTimeMs}ms) ===`);

      return {
        zodObjectInfos: analysisResult.zodSchemas,
        packages: analysisResult.packages,
        analysisResult,
        success: true,
        buildTimeMs: statistics.buildTimeMs,
        statistics,
        generatedFiles: generatedCode.map(c => c.outputPath),
        errors: analysisResult.errors,
        warnings: []
      };

    } catch (error) {
      logger.error('ビルド失敗:', error);
      return this.handleBuildError(error, context);
    }
  }

  /**
   * ファイル収集フェーズ
   * @param context - ビルドコンテキスト
   * @returns ファイルパスの配列
   */
  private async collectFiles(context: BuildContext): Promise<string[]> {
    const { option, logger } = context;
    
    logger.debug(`ターゲットパスをスキャン: ${option.targetPath}`);
    
    return await this.fileManager.scanTargetFiles(
      option.targetPath,
      option.ignores,
      option.advanced?.excludePatterns
    );
  }

  /**
   * 解析フェーズ
   * @param files - ファイルパスの配列
   * @param context - ビルドコンテキスト
   * @returns 解析結果
   */
  private async analyzeFiles(files: string[], context: BuildContext): Promise<AnalysisResult> {
    const { option, logger } = context;
    
    logger.debug('TypeScript解析を開始');
    const packages = await parseTypeScriptFiles(option.targetPath, option.ignores, {
      targetPath: option.targetPath,
      ignores: option.ignores,
      excludePatterns: option.advanced?.excludePatterns || [],
      concurrency: option.advanced?.concurrency || 4,
      verbose: option.advanced?.verbose || false
    });

    logger.debug('Zodスキーマ解析を開始');
    const zodSchemas = await analyzeZodSchemas(option.targetPath, {
      targetPath: option.targetPath,
      analyzeDeepNesting: true,
      maxNestingDepth: 10
    });

    return {
      packages,
      zodSchemas,
      errors: [],
      statistics: {
        totalFiles: files.length,
        totalFunctions: packages.reduce((sum, pkg) => sum + pkg.functions.length, 0),
        totalZodSchemas: zodSchemas.length,
        errorCount: 0,
        analysisTimeMs: 0
      }
    };
  }

  /**
   * コード生成フェーズ
   * @param analysis - 解析結果
   * @param context - ビルドコンテキスト
   * @returns 生成されたコードの配列
   */
  private async generateCode(
    analysis: AnalysisResult,
    context: BuildContext
  ): Promise<GeneratedCode[]> {
    const { option, logger } = context;

    logger.debug('コード生成を開始');

    const generatedCode: GeneratedCode[] = [];

    // プリロードスクリプト生成
    const preloadContent = generatePreloadScript(analysis.packages);
    generatedCode.push({
      type: 'preload',
      content: preloadContent,
      outputPath: option.preloadPath,
      size: Buffer.byteLength(preloadContent, 'utf8')
    });

    // ハンドラーコード生成
    const handlerContent = generateHandlers(analysis.packages, option.errorHandler);
    generatedCode.push({
      type: 'handler',
      content: handlerContent,
      outputPath: option.registerPath,
      size: Buffer.byteLength(handlerContent, 'utf8')
    });

    // 型定義生成
    const typesContent = generateTypeDefinitions(analysis.packages, analysis.zodSchemas);
    generatedCode.push({
      type: 'types',
      content: typesContent,
      outputPath: option.rendererPath,
      size: Buffer.byteLength(typesContent, 'utf8')
    });

    return generatedCode;
  }

  /**
   * ファイル出力フェーズ
   * @param generatedCode - 生成されたコードの配列
   * @param context - ビルドコンテキスト
   */
  private async writeGeneratedFiles(
    generatedCode: GeneratedCode[],
    context: BuildContext
  ): Promise<void> {
    const { option, logger } = context;

    logger.debug('ファイル出力を開始');

    for (const code of generatedCode) {
      await this.fileManager.writeGeneratedFile(
        code.outputPath,
        code.content,
        {
          createBackup: option.advanced?.createBackup || false
        }
      );
      
      logger.debug(`生成完了: ${code.type} -> ${code.outputPath} (${code.size} bytes)`);
    }
  }

  /**
   * 統計情報を生成
   * @param startTime - 開始時刻
   * @param endTime - 終了時刻
   * @param analysis - 解析結果
   * @param generatedCode - 生成されたコード
   * @returns 統計情報
   */
  private generateStatistics(
    startTime: number,
    endTime: number,
    analysis: AnalysisResult,
    generatedCode: GeneratedCode[]
  ): BuildStatistics {
    const memoryUsage = process.memoryUsage().heapUsed;

    return {
      startTime,
      endTime,
      buildTimeMs: endTime - startTime,
      analyzedFiles: analysis.statistics.totalFiles,
      extractedFunctions: analysis.statistics.totalFunctions,
      extractedSchemas: analysis.statistics.totalZodSchemas,
      generatedFiles: generatedCode.length,
      memoryUsage
    };
  }

  /**
   * ビルドエラーのハンドリング
   * @param error - エラー
   * @param context - ビルドコンテキスト
   * @returns エラー時のビルド結果
   */
  private handleBuildError(error: unknown, context: BuildContext): ExtendedBuildResult {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : String(error);

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
      generatedFiles: [],
      errors: [{
        type: 'parse_error',
        message: errorMessage
      }],
      warnings: []
    };
  }

  /**
   * ロガーを作成
   * @param logLevel - ログレベル
   * @returns ロガー
   */
  private createLogger(logLevel: string = 'info'): Logger {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[logLevel as keyof typeof levels] ?? 1;

    return {
      debug: (message: string, ...args: unknown[]): void => {
        if (currentLevel <= 0) console.log(`[DEBUG] ${message}`, ...args);
      },
      info: (message: string, ...args: unknown[]): void => {
        if (currentLevel <= 1) console.log(`[INFO] ${message}`, ...args);
      },
      warn: (message: string, ...args: unknown[]): void => {
        if (currentLevel <= 2) console.warn(`[WARN] ${message}`, ...args);
      },
      error: (message: string, ...args: unknown[]): void => {
        if (currentLevel <= 3) console.error(`[ERROR] ${message}`, ...args);
      }
    };
  }

  /**
   * 生成されたファイル（古いメソッド、後方互換性のため保持）
   * @param result - ビルド結果
   * @param option - オプション
   */
  async generateFiles(
    result: BuildResult,
    option: AutoCodeOption
  ): Promise<void> {
    // 既存のコード生成ロジックを呼び出し
    const preloadContent = generatePreloadScript(result.packages);
    const handlerContent = generateHandlers(result.packages, option.errorHandler);
    const typesContent = generateTypeDefinitions(result.packages, result.zodObjectInfos);

    await this.fileManager.writeGeneratedFile(option.preloadPath, preloadContent);
    await this.fileManager.writeGeneratedFile(option.registerPath, handlerContent);
    await this.fileManager.writeGeneratedFile(option.rendererPath, typesContent);
  }
}

/**
 * Phase 6: 差分ビルド機能の追加
 */

import type { FileChangeEvent } from './watch.js';
import { BuildCache } from './cache.js';

/**
 * 差分ビルドの結果
 */
export interface IncrementalBuildResult {
  /** ビルドが成功したかどうか */
  success: boolean;
  /** 処理されたファイル数 */
  processedFiles: number;
  /** 再生成された出力数 */
  regeneratedOutputs: string[];
  /** ビルド時間（ミリ秒） */
  duration: number;
  /** キャッシュヒット数 */
  cacheHits: number;
  /** キャッシュミス数 */
  cacheMisses: number;
  /** スキップされたファイル数 */
  skippedFiles: number;
}

/**
 * ビルドプラン
 */
export interface BuildPlan {
  /** 解析が必要なファイル */
  filesToParse: string[];
  /** 再生成が必要な出力 */
  outputsToRegenerate: Set<string>;
  /** 影響を受けるパッケージ */
  affectedPackages: string[];
  /** 使用可能なキャッシュエントリ */
  cachedResults: Map<string, PackageInfo>;
}

/**
 * ビルドプラン実行結果
 */
export interface BuildPlanResult {
  /** 再生成された出力のリスト */
  regeneratedOutputs: string[];
  /** 実行時間（ミリ秒） */
  duration: number;
  /** 解析されたファイル数 */
  analyzedFiles: number;
  /** キャッシュから取得されたファイル数 */
  cachedFiles: number;
}

/**
 * インクリメンタルビルダー
 * キャッシュシステムと連携して効率的な差分ビルドを実行
 */
export class IncrementalBuilder {
  private cache: BuildCache;
  private buildManager: BuildManager;
  private fileManager: FileManager;

  constructor(
    cache?: BuildCache,
    buildManager?: BuildManager,
    fileManagerInstance?: FileManager
  ) {
    this.cache = cache || new BuildCache();
    this.buildManager = buildManager || new BuildManager();
    this.fileManager = fileManagerInstance || fileManager;
  }

  /**
   * インクリメンタルビルドを実行
   */
  async performIncrementalBuild(
    changes: FileChangeEvent[],
    option: ExtendedAutoCodeOption
  ): Promise<IncrementalBuildResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: 影響を受けるファイルを分析
      const affectedFiles = await this.analyzeAffectedFiles(changes);
      
      // Step 2: ビルドプランを作成
      const buildPlan = await this.createBuildPlan(affectedFiles, option);
      
      // Step 3: ビルドプランを実行
      const result = await this.executeBuildPlan(buildPlan, option);
      
      const duration = Date.now() - startTime;
      const cacheStats = this.cache.getStats();
      
      return {
        success: true,
        processedFiles: affectedFiles.length,
        regeneratedOutputs: result.regeneratedOutputs,
        duration,
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
        skippedFiles: affectedFiles.length - result.analyzedFiles
      };
      
    } catch (error) {
      console.error('[IncrementalBuilder] 差分ビルドでエラーが発生:', error);
      
      return {
        success: false,
        processedFiles: 0,
        regeneratedOutputs: [],
        duration: Date.now() - startTime,
        cacheHits: 0,
        cacheMisses: 0,
        skippedFiles: 0
      };
    }
  }

  /**
   * 影響を受けるファイルを分析
   */
  private async analyzeAffectedFiles(changes: FileChangeEvent[]): Promise<string[]> {
    const directlyAffected = new Set<string>();
    const dependentFiles = new Set<string>();
    
    // 直接変更されたファイルを収集
    for (const change of changes) {
      if (change.type === 'unlink') {
        // 削除されたファイルのキャッシュを無効化
        this.cache.invalidate(change.path);
      } else {
        directlyAffected.add(change.path);
      }
    }
    
    // 依存関係を辿って影響を受けるファイルを特定
    for (const filePath of directlyAffected) {
      const dependents = await this.findDependentFiles(filePath);
      dependents.forEach(dep => dependentFiles.add(dep));
    }
    
    return [...new Set([...directlyAffected, ...dependentFiles])];
  }

  /**
   * 依存関係のあるファイルを検索
   */
  private async findDependentFiles(filePath: string): Promise<string[]> {
    const dependents: string[] = [];
    
    try {
      // ファイルの内容を解析してimport文を検索
      const targetDir = path.dirname(filePath);
      const files = await this.fileManager.scanTargetFiles(targetDir, [], []);
      
      for (const file of files) {
        if (file === filePath) continue;
        
        try {
          const content = await fs.readFile(file, 'utf8');
          const relativePath = path.relative(path.dirname(file), filePath);
          
          // import文でこのファイルを参照しているかチェック
          if (this.hasImportReference(content, relativePath, filePath)) {
            dependents.push(file);
          }
        } catch {
          // ファイル読み込みエラーは無視
        }
      }
    } catch (error) {
      console.warn(`[IncrementalBuilder] 依存関係の分析に失敗: ${filePath}`, error);
    }
    
    return dependents;
  }

  /**
   * ファイルがimport文で参照されているかチェック
   */
  private hasImportReference(content: string, relativePath: string, absolutePath: string): boolean {
    const importRegex = /import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // 相対パスまたは絶対パスでマッチするかチェック
      if (importPath && (
          importPath.includes(path.basename(absolutePath, '.ts')) ||
          importPath.includes(relativePath.replace('.ts', '')))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * ビルドプランを作成
   */
  private async createBuildPlan(
    affectedFiles: string[],
    option: ExtendedAutoCodeOption
  ): Promise<BuildPlan> {
    const plan: BuildPlan = {
      filesToParse: [],
      outputsToRegenerate: new Set(),
      affectedPackages: [],
      cachedResults: new Map()
    };
    
    for (const filePath of affectedFiles) {
      // キャッシュから結果を取得を試行
      const cached = await this.cache.getParseResult(filePath);
      
      if (cached) {
        plan.cachedResults.set(filePath, cached);
      } else {
        plan.filesToParse.push(filePath);
      }
      
      // このファイルの変更がどの出力に影響するかを判定
      const affectedOutputs = this.determineAffectedOutputs(filePath, option);
      affectedOutputs.forEach(output => plan.outputsToRegenerate.add(output));
      
      // 影響を受けるパッケージを記録
      const packageName = this.getPackageNameFromPath(filePath);
      if (packageName && !plan.affectedPackages.includes(packageName)) {
        plan.affectedPackages.push(packageName);
      }
    }
    
    return plan;
  }

  /**
   * 影響を受ける出力を判定
   */
  private determineAffectedOutputs(_filePath: string, _option: ExtendedAutoCodeOption): string[] {
    const outputs: string[] = [];
    
    // すべての出力が影響を受ける（将来的にはより細かい判定が可能）
    outputs.push('preload', 'handler', 'types');
    
    return outputs;
  }

  /**
   * ファイルパスからパッケージ名を取得
   */
  private getPackageNameFromPath(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * ビルドプランを実行
   */
  private async executeBuildPlan(
    plan: BuildPlan,
    option: ExtendedAutoCodeOption
  ): Promise<BuildPlanResult> {
    const startTime = Date.now();
    const regeneratedOutputs: string[] = [];
    
    // Step 1: 必要なファイルのみを解析
    const parseResults = new Map<string, PackageInfo>();
    
    // キャッシュされた結果を使用
    for (const [filePath, result] of plan.cachedResults) {
      parseResults.set(filePath, result);
    }
    
    // 新しく解析が必要なファイルを処理
    if (plan.filesToParse.length > 0) {
      const newResults = await parseTypeScriptFiles(
        option.targetPath, 
        option.ignores,
        {
          targetPath: option.targetPath,
          ignores: option.ignores,
          excludePatterns: plan.filesToParse, // 指定されたファイルのみを解析
          concurrency: option.advanced?.concurrency || 4,
          verbose: option.advanced?.verbose || false
        }
      );
      
      // 結果をキャッシュに保存
      for (const pkg of newResults) {
        parseResults.set(pkg.filePath, pkg);
        await this.cache.setParseResult(pkg.filePath, pkg);
      }
    }
    
    // Step 2: 影響を受ける出力のみを再生成
    const packages = Array.from(parseResults.values());
    
    if (plan.outputsToRegenerate.has('preload')) {
      const preloadContent = generatePreloadScript(packages);
      await this.fileManager.writeGeneratedFile(option.preloadPath, preloadContent);
      regeneratedOutputs.push('preload');
    }
    
    if (plan.outputsToRegenerate.has('handler')) {
      const handlerContent = generateHandlers(packages, option.errorHandler);
      await this.fileManager.writeGeneratedFile(option.registerPath, handlerContent);
      regeneratedOutputs.push('handler');
    }
    
    if (plan.outputsToRegenerate.has('types')) {
      // Zodスキーマも必要に応じて再解析
      const zodSchemas = await analyzeZodSchemas(option.targetPath, {
        targetPath: option.targetPath,
        analyzeDeepNesting: true,
        maxNestingDepth: 10
      });
      
      const typesContent = generateTypeDefinitions(packages, zodSchemas);
      await this.fileManager.writeGeneratedFile(option.rendererPath, typesContent);
      regeneratedOutputs.push('types');
    }
    
    return {
      regeneratedOutputs,
      duration: Date.now() - startTime,
      analyzedFiles: plan.filesToParse.length,
      cachedFiles: plan.cachedResults.size
    };
  }
}

/**
 * デフォルトのビルドマネージャーインスタンス
 */
export const buildManager = new BuildManager();

/**
 * デフォルトのインクリメンタルビルダーインスタンス
 */
export const incrementalBuilder = new IncrementalBuilder();
