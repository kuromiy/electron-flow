/**
 * Phase 6: パフォーマンス監視システム
 * ビルド時間、メモリ使用量、キャッシュヒット率の監視とアラート機能を実装
 */

/**
 * パフォーマンス測定結果
 */
export interface PerformanceMeasurement {
  /** 開始時刻 */
  startTime: number;
  /** 開始時のメモリ使用量 */
  startMemory: ReturnType<typeof process.memoryUsage>;
  
  /**
   * 測定を終了して結果を取得
   */
  end(): PerformanceResult;
}

/**
 * パフォーマンス測定結果
 */
export interface PerformanceResult {
  /** 実行時間（ミリ秒） */
  duration: number;
  /** メモリ使用量の変化（バイト） */
  memoryDelta: number;
  /** ピーク時のメモリ使用量（バイト） */
  peakMemory: number;
  /** 開始時のメモリ使用量（バイト） */
  startMemory: number;
  /** 終了時のメモリ使用量（バイト） */
  endMemory: number;
}

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  /** ビルド時間の履歴（ミリ秒） */
  buildTimes: number[];
  /** メモリ使用量の履歴（バイト） */
  memoryUsage: number[];
  /** ファイル数 */
  fileCount: number;
  /** キャッシュヒット数 */
  cacheHits: number;
  /** キャッシュミス数 */
  cacheMisses: number;
  /** キャッシュヒット率 */
  cacheHitRate: number;
  /** 総ビルド数 */
  totalBuilds: number;
  /** 成功したビルド数 */
  successfulBuilds: number;
  /** 失敗したビルド数 */
  failedBuilds: number;
}

/**
 * 平均メトリクス
 */
export interface AverageMetrics {
  /** 平均ビルド時間（ミリ秒） */
  averageBuildTime: number;
  /** 平均メモリ使用量（バイト） */
  averageMemoryUsage: number;
  /** キャッシュヒット率 */
  cacheHitRate: number;
  /** 総ビルド数 */
  totalBuilds: number;
  /** 成功率 */
  successRate: number;
  /** ファイル数あたりの平均ビルド時間 */
  averageBuildTimePerFile: number;
}

/**
 * パフォーマンスアラート
 */
export interface PerformanceAlert {
  /** アラートタイプ */
  type: 'SLOW_BUILD' | 'HIGH_MEMORY' | 'LOW_CACHE_HIT_RATE' | 'HIGH_FAILURE_RATE';
  /** アラートメッセージ */
  message: string;
  /** 改善提案 */
  suggestion: string;
  /** 現在の値 */
  currentValue: number;
  /** 閾値 */
  threshold: number;
  /** 重要度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * パフォーマンス設定
 */
export interface PerformanceConfig {
  /** ビルド時間の警告閾値（ミリ秒） */
  slowBuildThreshold: number;
  /** メモリ使用量の警告閾値（バイト） */
  highMemoryThreshold: number;
  /** キャッシュヒット率の最低閾値 */
  minCacheHitRate: number;
  /** 失敗率の最大閾値 */
  maxFailureRate: number;
  /** メトリクス履歴の最大保持数 */
  maxHistorySize: number;
  /** アラートを有効にするかどうか */
  enableAlerts: boolean;
}

/**
 * パフォーマンス監視システム
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    buildTimes: [],
    memoryUsage: [],
    fileCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    totalBuilds: 0,
    successfulBuilds: 0,
    failedBuilds: 0
  };

  private config: PerformanceConfig;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      slowBuildThreshold: 10000, // 10秒
      highMemoryThreshold: 500 * 1024 * 1024, // 500MB
      minCacheHitRate: 0.8, // 80%
      maxFailureRate: 0.1, // 10%
      maxHistorySize: 100,
      enableAlerts: true,
      ...config
    };
  }

  /**
   * ビルド測定を開始
   */
  startBuildMeasurement(): PerformanceMeasurement {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    return {
      startTime,
      startMemory,
      
      end: (): PerformanceResult => {
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        
        const result: PerformanceResult = {
          duration: endTime - startTime,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          peakMemory: endMemory.heapUsed,
          startMemory: startMemory.heapUsed,
          endMemory: endMemory.heapUsed
        };
        
        this.recordMeasurement(result);
        return result;
      }
    };
  }

  /**
   * ビルド成功を記録
   */
  recordBuildSuccess(duration: number, fileCount: number = 0): void {
    this.metrics.totalBuilds++;
    this.metrics.successfulBuilds++;
    this.recordBuildTime(duration);
    this.metrics.fileCount = fileCount;
    this.updateCacheHitRate();
  }

  /**
   * ビルド失敗を記録
   */
  recordBuildFailure(duration: number): void {
    this.metrics.totalBuilds++;
    this.metrics.failedBuilds++;
    this.recordBuildTime(duration);
  }

  /**
   * キャッシュヒットを記録
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++;
    this.updateCacheHitRate();
  }

  /**
   * キャッシュミスを記録
   */
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
    this.updateCacheHitRate();
  }

  /**
   * メモリ使用量を記録
   */
  recordMemoryUsage(memoryUsage: number): void {
    this.metrics.memoryUsage.push(memoryUsage);
    this.trimHistory(this.metrics.memoryUsage);
  }

  /**
   * 平均メトリクスを取得
   */
  getAverageMetrics(): AverageMetrics {
    const averageBuildTime = this.calculateAverage(this.metrics.buildTimes);
    const averageMemoryUsage = this.calculateAverage(this.metrics.memoryUsage);
    const successRate = this.metrics.totalBuilds > 0 
      ? this.metrics.successfulBuilds / this.metrics.totalBuilds 
      : 0;
    const averageBuildTimePerFile = this.metrics.fileCount > 0 
      ? averageBuildTime / this.metrics.fileCount 
      : 0;

    return {
      averageBuildTime,
      averageMemoryUsage,
      cacheHitRate: this.metrics.cacheHitRate,
      totalBuilds: this.metrics.totalBuilds,
      successRate,
      averageBuildTimePerFile
    };
  }

  /**
   * パフォーマンス問題をチェック
   */
  checkPerformanceThresholds(): PerformanceAlert[] {
    if (!this.config.enableAlerts) {
      return [];
    }

    const alerts: PerformanceAlert[] = [];
    const avg = this.getAverageMetrics();

    // ビルド時間のチェック
    if (avg.averageBuildTime > this.config.slowBuildThreshold) {
      alerts.push({
        type: 'SLOW_BUILD',
        message: `平均ビルド時間が${Math.round(avg.averageBuildTime)}msです`,
        suggestion: 'キャッシュ設定を確認するか、対象ファイルを減らしてください',
        currentValue: avg.averageBuildTime,
        threshold: this.config.slowBuildThreshold,
        severity: avg.averageBuildTime > this.config.slowBuildThreshold * 2 ? 'critical' : 'high'
      });
    }

    // メモリ使用量のチェック
    if (avg.averageMemoryUsage > this.config.highMemoryThreshold) {
      alerts.push({
        type: 'HIGH_MEMORY',
        message: `平均メモリ使用量が${Math.round(avg.averageMemoryUsage / 1024 / 1024)}MBです`,
        suggestion: 'ファイルサイズやキャッシュサイズを確認してください',
        currentValue: avg.averageMemoryUsage,
        threshold: this.config.highMemoryThreshold,
        severity: avg.averageMemoryUsage > this.config.highMemoryThreshold * 1.5 ? 'critical' : 'high'
      });
    }

    // キャッシュヒット率のチェック
    if (avg.cacheHitRate < this.config.minCacheHitRate) {
      alerts.push({
        type: 'LOW_CACHE_HIT_RATE',
        message: `キャッシュヒット率が${Math.round(avg.cacheHitRate * 100)}%です`,
        suggestion: 'ファイル変更頻度を確認するか、キャッシュTTLを調整してください',
        currentValue: avg.cacheHitRate,
        threshold: this.config.minCacheHitRate,
        severity: avg.cacheHitRate < this.config.minCacheHitRate * 0.5 ? 'critical' : 'medium'
      });
    }

    // 失敗率のチェック
    const failureRate = 1 - avg.successRate;
    if (failureRate > this.config.maxFailureRate) {
      alerts.push({
        type: 'HIGH_FAILURE_RATE',
        message: `ビルド失敗率が${Math.round(failureRate * 100)}%です`,
        suggestion: 'エラーログを確認し、設定や依存関係を見直してください',
        currentValue: failureRate,
        threshold: this.config.maxFailureRate,
        severity: failureRate > this.config.maxFailureRate * 2 ? 'critical' : 'high'
      });
    }

    return alerts;
  }

  /**
   * 詳細なパフォーマンスレポートを生成
   */
  generateReport(): PerformanceReport {
    const avg = this.getAverageMetrics();
    const alerts = this.checkPerformanceThresholds();
    
    return {
      timestamp: new Date(),
      averageMetrics: avg,
      rawMetrics: { ...this.metrics },
      alerts,
      recommendations: this.generateRecommendations(avg, alerts)
    };
  }

  /**
   * メトリクスをクリア
   */
  clearMetrics(): void {
    this.metrics = {
      buildTimes: [],
      memoryUsage: [],
      fileCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      totalBuilds: 0,
      successfulBuilds: 0,
      failedBuilds: 0
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在のメトリクスを取得
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * パフォーマンス統計をコンソールに出力
   */
  printStats(): void {
    const avg = this.getAverageMetrics();
    
    console.log('\n=== electron-flow パフォーマンス統計 ===');
    console.log(`総ビルド数: ${avg.totalBuilds}`);
    console.log(`成功率: ${Math.round(avg.successRate * 100)}%`);
    console.log(`平均ビルド時間: ${Math.round(avg.averageBuildTime)}ms`);
    console.log(`平均メモリ使用量: ${Math.round(avg.averageMemoryUsage / 1024 / 1024)}MB`);
    console.log(`キャッシュヒット率: ${Math.round(avg.cacheHitRate * 100)}%`);
    
    if (this.metrics.fileCount > 0) {
      console.log(`ファイル数あたりの平均ビルド時間: ${Math.round(avg.averageBuildTimePerFile)}ms/file`);
    }
    
    const alerts = this.checkPerformanceThresholds();
    if (alerts.length > 0) {
      console.log('\n⚠️  パフォーマンスアラート:');
      alerts.forEach(alert => {
        console.log(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
        console.log(`    💡 ${alert.suggestion}`);
      });
    } else {
      console.log('\n✅ パフォーマンスは良好です');
    }
    console.log('=====================================\n');
  }

  /**
   * 測定結果を記録
   */
  private recordMeasurement(result: PerformanceResult): void {
    this.recordMemoryUsage(result.peakMemory);
  }

  /**
   * ビルド時間を記録
   */
  private recordBuildTime(duration: number): void {
    this.metrics.buildTimes.push(duration);
    this.trimHistory(this.metrics.buildTimes);
  }

  /**
   * キャッシュヒット率を更新
   */
  private updateCacheHitRate(): void {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? this.metrics.cacheHits / total : 0;
  }

  /**
   * 平均値を計算
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * 履歴のサイズを制限
   */
  private trimHistory(array: number[]): void {
    if (array.length > this.config.maxHistorySize) {
      array.splice(0, array.length - this.config.maxHistorySize);
    }
  }

  /**
   * 改善提案を生成
   */
  private generateRecommendations(
    metrics: AverageMetrics, 
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];

    if (alerts.some(alert => alert.type === 'SLOW_BUILD')) {
      recommendations.push('ビルド時間改善: キャッシュ機能を活用し、不要なファイルを除外してください');
    }

    if (alerts.some(alert => alert.type === 'HIGH_MEMORY')) {
      recommendations.push('メモリ使用量削減: 大量のファイルを一度に処理する場合は、並列度を下げてください');
    }

    if (alerts.some(alert => alert.type === 'LOW_CACHE_HIT_RATE')) {
      recommendations.push('キャッシュ効率改善: ファイル変更頻度を確認し、キャッシュTTLを適切に設定してください');
    }

    if (metrics.totalBuilds > 10 && metrics.successRate > 0.95) {
      recommendations.push('✅ パフォーマンスは良好です。現在の設定を維持してください');
    }

    return recommendations;
  }
}

/**
 * パフォーマンスレポート
 */
export interface PerformanceReport {
  /** レポート生成時刻 */
  timestamp: Date;
  /** 平均メトリクス */
  averageMetrics: AverageMetrics;
  /** 生メトリクス */
  rawMetrics: PerformanceMetrics;
  /** アラート */
  alerts: PerformanceAlert[];
  /** 改善提案 */
  recommendations: string[];
}

/**
 * デフォルトのパフォーマンスモニターインスタンス
 */
export const performanceMonitor = new PerformanceMonitor();