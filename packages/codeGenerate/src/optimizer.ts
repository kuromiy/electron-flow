/**
 * Phase 6: メモリ最適化・ベンチマーク機能
 * ガベージコレクション、メモリ管理、パフォーマンステストの実装
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BuildManager } from './build.js';
import { BuildCache } from './cache.js';
import { PerformanceMonitor } from './performance.js';
import type { AutoCodeOption } from './index.js';
import type { ExtendedAutoCodeOption } from './config.js';

/**
 * ベンチマーク測定結果
 */
export interface BenchmarkMeasurement {
  /** ファイル数 */
  fileCount: number;
  /** ビルド時間（ミリ秒） */
  buildTime: number;
  /** メモリ使用量（バイト） */
  memoryUsage: number;
  /** キャッシュヒット率 */
  cacheHitRate: number;
  /** 1ファイルあたりの平均ビルド時間 */
  buildTimePerFile: number;
  /** ファイルサイズの合計（バイト） */
  totalFileSize: number;
}

/**
 * ベンチマーク結果
 */
export interface BenchmarkResult {
  /** 測定データ */
  measurements: BenchmarkMeasurement[];
  /** テスト開始時刻 */
  startTime: Date;
  /** テスト終了時刻 */
  endTime: Date;
  /** 総実行時間（ミリ秒） */
  totalDuration: number;
  /** パフォーマンス評価 */
  evaluation: PerformanceEvaluation;
}

/**
 * パフォーマンス評価
 */
export interface PerformanceEvaluation {
  /** 総合スコア（0-100） */
  overallScore: number;
  /** ビルド速度スコア（0-100） */
  buildSpeedScore: number;
  /** メモリ効率スコア（0-100） */
  memoryEfficiencyScore: number;
  /** キャッシュ効率スコア（0-100） */
  cacheEfficiencyScore: number;
  /** 評価レベル */
  level: 'excellent' | 'good' | 'fair' | 'poor';
  /** 改善提案 */
  suggestions: string[];
}

/**
 * メモリ最適化設定
 */
export interface MemoryOptimizerConfig {
  /** ガベージコレクション実行の閾値（バイト） */
  gcThreshold: number;
  /** 強制GCを有効にするか */
  enableForceGC: boolean;
  /** 大きなオブジェクトの閾値（バイト） */
  largeObjectThreshold: number;
  /** メモリ監視の間隔（ミリ秒） */
  memoryCheckInterval: number;
  /** 自動最適化を有効にするか */
  enableAutoOptimization: boolean;
}

/**
 * サンプルプロジェクト設定
 */
export interface SampleProjectConfig {
  /** ファイル数 */
  fileCount: number;
  /** 各ファイルの平均関数数 */
  functionsPerFile: number;
  /** 各ファイルの平均Zodスキーマ数 */
  schemasPerFile: number;
  /** 依存関係の複雑さ（0-1） */
  dependencyComplexity: number;
}

/**
 * メモリ最適化・ベンチマーク機能
 */
export class MemoryOptimizer {
  private config: MemoryOptimizerConfig;
  private buildManager: BuildManager;
  private cache: BuildCache;
  private performanceMonitor: PerformanceMonitor;
  private largeObjectRefs: Set<WeakRef<object>> = new Set();
  private memoryCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    config?: Partial<MemoryOptimizerConfig>,
    buildManager?: BuildManager,
    cache?: BuildCache,
    performanceMonitor?: PerformanceMonitor
  ) {
    this.config = {
      gcThreshold: 100 * 1024 * 1024, // 100MB
      enableForceGC: process.env['NODE_ENV'] === 'development',
      largeObjectThreshold: 10 * 1024 * 1024, // 10MB
      memoryCheckInterval: 30000, // 30秒
      enableAutoOptimization: true,
      ...config
    };

    this.buildManager = buildManager || new BuildManager();
    this.cache = cache || new BuildCache();
    this.performanceMonitor = performanceMonitor || new PerformanceMonitor();

    if (this.config.enableAutoOptimization) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * メモリ使用量を最適化
   */
  async optimizeMemoryUsage(): Promise<void> {
    const beforeMemory = process.memoryUsage();
    
    console.log('[MemoryOptimizer] メモリ最適化を開始');
    
    // Step 1: 大きなオブジェクト参照をクリア
    this.clearLargeReferences();
    
    // Step 2: キャッシュの古いエントリを削除
    await this.cache.cleanup();
    
    // Step 3: 強制ガベージコレクション（開発環境のみ）
    if (this.config.enableForceGC && global.gc) {
      global.gc();
    }
    
    const afterMemory = process.memoryUsage();
    const memoryFreed = beforeMemory.heapUsed - afterMemory.heapUsed;
    
    console.log(`[MemoryOptimizer] 最適化完了: ${Math.round(memoryFreed / 1024 / 1024)}MB解放`);
  }

  /**
   * ベンチマークを実行
   */
  async runBenchmark(option: AutoCodeOption): Promise<BenchmarkResult> {
    const sampleSizes = [10, 25, 50, 75, 100];
    const measurements: BenchmarkMeasurement[] = [];
    const startTime = new Date();
    
    console.log('[MemoryOptimizer] ベンチマーク開始');
    
    for (const fileCount of sampleSizes) {
      console.log(`  📊 ${fileCount}ファイルでテスト中...`);
      
      const sampleProject = await this.createSampleProject({
        fileCount,
        functionsPerFile: 3,
        schemasPerFile: 1,
        dependencyComplexity: 0.3
      });
      
      const measurement = await this.measureBuildTime(sampleProject, option);
      measurements.push(measurement);
      
      // 各測定後にメモリをクリーンアップ
      await this.optimizeMemoryUsage();
    }
    
    const endTime = new Date();
    const evaluation = this.evaluatePerformance(measurements);
    
    const result: BenchmarkResult = {
      measurements,
      startTime,
      endTime,
      totalDuration: endTime.getTime() - startTime.getTime(),
      evaluation
    };
    
    this.printBenchmarkReport(result);
    return result;
  }

  /**
   * 大きなオブジェクトの参照を登録
   */
  registerLargeObject(obj: unknown): void {
    if (obj && typeof obj === 'object' && this.estimateObjectSize(obj) > this.config.largeObjectThreshold) {
      this.largeObjectRefs.add(new WeakRef(obj as object));
    }
  }

  /**
   * メモリ監視を停止
   */
  stop(): void {
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = null;
    }
  }

  /**
   * 現在のメモリ使用状況を取得
   */
  getMemoryUsage(): ReturnType<typeof process.memoryUsage> & { formattedHeap: string; formattedRss: string } {
    const usage = process.memoryUsage();
    return {
      ...usage,
      formattedHeap: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      formattedRss: `${Math.round(usage.rss / 1024 / 1024)}MB`
    };
  }

  /**
   * パフォーマンステストプロジェクトを作成
   */
  private async createSampleProject(config: SampleProjectConfig): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp-benchmark');
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
      
      for (let i = 0; i < config.fileCount; i++) {
        const filePath = path.join(tempDir, `test-file-${i}.ts`);
        const content = this.generateSampleFileContent({
          fileName: `TestFile${i}`,
          functionCount: config.functionsPerFile,
          schemaCount: config.schemasPerFile,
          hasDependencies: Math.random() < config.dependencyComplexity
        });
        
        await fs.writeFile(filePath, content, 'utf8');
      }
      
      return tempDir;
      
    } catch (error) {
      console.error('[MemoryOptimizer] サンプルプロジェクト作成エラー:', error);
      throw error;
    }
  }

  /**
   * ビルド時間を測定
   */
  private async measureBuildTime(
    projectPath: string, 
    option: AutoCodeOption
  ): Promise<BenchmarkMeasurement> {
    const testOption: ExtendedAutoCodeOption = {
      ...option,
      targetPath: projectPath,
      logLevel: 'error', // ベンチマーク中はログを抑制
      advanced: {
        concurrency: 4,
        verbose: false,
        createBackup: false,
        excludePatterns: []
      }
    };
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    try {
      await this.buildManager.build(testOption);
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      
      // ファイル情報を収集
      const files = await this.getProjectFiles(projectPath);
      const totalFileSize = await this.calculateTotalFileSize(files);
      
      const buildTime = endTime - startTime;
      const memoryUsage = endMemory.heapUsed - startMemory.heapUsed;
      const cacheStats = this.cache.getStats();
      
      // 測定後にテンポラリファイルを削除
      await this.cleanupTempProject(projectPath);
      
      return {
        fileCount: files.length,
        buildTime,
        memoryUsage,
        cacheHitRate: cacheStats.hitRate,
        buildTimePerFile: buildTime / files.length,
        totalFileSize
      };
      
    } catch (error) {
      console.error('[MemoryOptimizer] ビルド測定エラー:', error);
      await this.cleanupTempProject(projectPath);
      throw error;
    }
  }

  /**
   * パフォーマンスを評価
   */
  private evaluatePerformance(measurements: BenchmarkMeasurement[]): PerformanceEvaluation {
    const avgBuildTimePerFile = measurements.reduce((sum, m) => sum + m.buildTimePerFile, 0) / measurements.length;
    const avgMemoryUsage = measurements.reduce((sum, m) => sum + m.memoryUsage, 0) / measurements.length;
    const avgCacheHitRate = measurements.reduce((sum, m) => sum + m.cacheHitRate, 0) / measurements.length;
    
    // スコア計算（0-100）
    const buildSpeedScore = Math.max(0, 100 - (avgBuildTimePerFile / 100) * 10); // 100ms/file = 90点
    const memoryEfficiencyScore = Math.max(0, 100 - (avgMemoryUsage / (10 * 1024 * 1024)) * 10); // 10MB = 90点
    const cacheEfficiencyScore = avgCacheHitRate * 100;
    
    const overallScore = (buildSpeedScore + memoryEfficiencyScore + cacheEfficiencyScore) / 3;
    
    let level: PerformanceEvaluation['level'];
    if (overallScore >= 90) level = 'excellent';
    else if (overallScore >= 70) level = 'good';
    else if (overallScore >= 50) level = 'fair';
    else level = 'poor';
    
    const suggestions = this.generatePerformanceSuggestions({
      buildSpeedScore,
      memoryEfficiencyScore,
      cacheEfficiencyScore
    });
    
    return {
      overallScore,
      buildSpeedScore,
      memoryEfficiencyScore,
      cacheEfficiencyScore,
      level,
      suggestions
    };
  }

  /**
   * サンプルファイルのコンテンツを生成
   */
  private generateSampleFileContent(config: {
    fileName: string;
    functionCount: number;
    schemaCount: number;
    hasDependencies: boolean;
  }): string {
    let content = `// Generated test file: ${config.fileName}\n\n`;
    
    // インポート文
    if (config.hasDependencies) {
      content += "import { z } from 'zod';\n";
      content += "import type { Context } from '../types/context';\n\n";
    } else {
      content += "import { z } from 'zod';\n\n";
    }
    
    // Zodスキーマ
    for (let i = 0; i < config.schemaCount; i++) {
      content += `export const ${config.fileName.toLowerCase()}Schema${i} = z.object({\n`;
      content += "  id: z.string(),\n";
      content += "  name: z.string(),\n";
      content += "  value: z.number().optional(),\n";
      content += "  active: z.boolean().default(true)\n";
      content += "});\n\n";
      
      content += `export type ${config.fileName}Type${i} = z.infer<typeof ${config.fileName.toLowerCase()}Schema${i}>;\n\n`;
    }
    
    // 関数
    for (let i = 0; i < config.functionCount; i++) {
      const funcName = `${config.fileName.toLowerCase()}Function${i}`;
      
      content += `export async function ${funcName}(\n`;
      if (config.hasDependencies) {
        content += "  ctx: Context,\n";
      }
      content += `  request: ${config.fileName}Type0\n`;
      content += `): Promise<${config.fileName}Type0> {\n`;
      content += "  // Sample implementation\n";
      content += "  return {\n";
      content += "    id: request.id,\n";
      content += "    name: request.name || 'default',\n";
      content += "    value: request.value || Math.floor(Math.random() * 100),\n";
      content += "    active: request.active\n";
      content += "  };\n";
      content += "}\n\n";
    }
    
    return content;
  }

  /**
   * 大きなオブジェクト参照をクリア
   */
  private clearLargeReferences(): void {
    let clearCount = 0;
    
    for (const ref of this.largeObjectRefs) {
      const obj = ref.deref();
      if (obj) {
        // オブジェクトのプロパティをクリア
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => {
            try {
              delete (obj as Record<string, unknown>)[key];
              clearCount++;
            } catch {
              // プロパティ削除に失敗した場合は無視
            }
          });
        }
      }
    }
    
    this.largeObjectRefs.clear();
    
    if (clearCount > 0) {
      console.log(`[MemoryOptimizer] ${clearCount}個の大きなオブジェクト参照をクリア`);
    }
  }

  /**
   * メモリ監視を開始
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckTimer = setInterval(() => {
      const usage = process.memoryUsage();
      
      if (usage.heapUsed > this.config.gcThreshold) {
        console.log(`[MemoryOptimizer] メモリ使用量が閾値を超過: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
        this.optimizeMemoryUsage().catch(error => {
          console.warn('[MemoryOptimizer] 自動最適化でエラーが発生:', error);
        });
      }
    }, this.config.memoryCheckInterval);
  }

  /**
   * オブジェクトサイズを概算
   */
  private estimateObjectSize(obj: unknown): number {
    try {
      return JSON.stringify(obj).length * 2; // 概算（UTF-16）
    } catch {
      return 0;
    }
  }

  /**
   * プロジェクトファイル一覧を取得
   */
  private async getProjectFiles(projectPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
        .map(entry => path.join(projectPath, entry.name));
    } catch {
      return [];
    }
  }

  /**
   * ファイルサイズの合計を計算
   */
  private async calculateTotalFileSize(files: string[]): Promise<number> {
    let totalSize = 0;
    
    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        totalSize += stats.size;
      } catch {
        // ファイル読み込みエラーは無視
      }
    }
    
    return totalSize;
  }

  /**
   * 一時プロジェクトをクリーンアップ
   */
  private async cleanupTempProject(projectPath: string): Promise<void> {
    try {
      await fs.rm(projectPath, { recursive: true, force: true });
    } catch {
      // クリーンアップエラーは無視（警告のみ）
      console.warn(`[MemoryOptimizer] 一時ディレクトリの削除に失敗: ${projectPath}`);
    }
  }

  /**
   * パフォーマンス改善提案を生成
   */
  private generatePerformanceSuggestions(scores: {
    buildSpeedScore: number;
    memoryEfficiencyScore: number;
    cacheEfficiencyScore: number;
  }): string[] {
    const suggestions: string[] = [];
    
    if (scores.buildSpeedScore < 70) {
      suggestions.push('ビルド速度: 並列処理数を調整するか、対象ファイルを減らしてください');
    }
    
    if (scores.memoryEfficiencyScore < 70) {
      suggestions.push('メモリ効率: キャッシュサイズを制限するか、大きなファイルを分割してください');
    }
    
    if (scores.cacheEfficiencyScore < 70) {
      suggestions.push('キャッシュ効率: ファイル変更頻度を確認し、キャッシュ設定を最適化してください');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('✅ パフォーマンスは良好です。現在の設定を維持してください');
    }
    
    return suggestions;
  }

  /**
   * ベンチマーク結果を出力
   */
  private printBenchmarkReport(result: BenchmarkResult): void {
    console.log('\n=== electron-flow ベンチマーク結果 ===');
    console.log(`実行時間: ${Math.round(result.totalDuration / 1000)}秒`);
    console.log(`総合スコア: ${Math.round(result.evaluation.overallScore)}点 (${result.evaluation.level})`);
    console.log(`ビルド速度: ${Math.round(result.evaluation.buildSpeedScore)}点`);
    console.log(`メモリ効率: ${Math.round(result.evaluation.memoryEfficiencyScore)}点`);
    console.log(`キャッシュ効率: ${Math.round(result.evaluation.cacheEfficiencyScore)}点`);
    
    console.log('\n📊 詳細測定結果:');
    result.measurements.forEach((m) => {
      console.log(`  ${m.fileCount}ファイル: ${Math.round(m.buildTime)}ms (${Math.round(m.buildTimePerFile)}ms/file)`);
    });
    
    console.log('\n💡 改善提案:');
    result.evaluation.suggestions.forEach(suggestion => {
      console.log(`  • ${suggestion}`);
    });
    
    console.log('======================================\n');
  }
}

/**
 * デフォルトのメモリ最適化インスタンス
 */
export const memoryOptimizer = new MemoryOptimizer();