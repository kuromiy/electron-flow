/**
 * Phase 6: 効率的なキャッシュシステム
 * ファイルハッシュベースの多層キャッシュとメモリ管理を実装
 */

import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import * as path from 'path';
import type { 
  AnalysisResult, 
  PackageInfo, 
  ZodObjectInfo,
  ParseOptions 
} from './types.js';

/**
 * キャッシュエントリの基底インターフェース
 */
export interface CacheEntry<T> {
  /** キャッシュされたデータ */
  data: T;
  /** ファイルのハッシュ値 */
  hash: string;
  /** 作成日時 */
  timestamp: Date;
  /** 依存関係のファイルパス */
  dependencies: string[];
  /** アクセス回数 */
  accessCount: number;
  /** 最終アクセス日時 */
  lastAccessed: Date;
}

/**
 * 解析結果のキャッシュエントリ
 */
export interface ParseResultCache extends CacheEntry<PackageInfo> {
  /** TypeScriptコンパイラの設定ハッシュ */
  compilerOptionsHash?: string;
}

/**
 * Zod解析結果のキャッシュエントリ
 */
export interface ZodAnalysisCache extends CacheEntry<ZodObjectInfo[]> {
  /** 解析オプションのハッシュ */
  optionsHash: string;
}

/**
 * 完全な解析結果のキャッシュエントリ
 */
export interface AnalysisResultCache extends CacheEntry<AnalysisResult> {
  /** 解析に含まれたファイル数 */
  fileCount: number;
  /** 解析時間（ミリ秒） */
  analysisTime: number;
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  /** 総エントリ数 */
  totalEntries: number;
  /** メモリ使用量（バイト） */
  memoryUsage: number;
  /** キャッシュヒット数 */
  hits: number;
  /** キャッシュミス数 */
  misses: number;
  /** ヒット率（0-1） */
  hitRate: number;
  /** 最終クリーンアップ時刻 */
  lastCleanup?: Date;
}

/**
 * キャッシュ設定
 */
export interface CacheConfig {
  /** 最大エントリ数 */
  maxEntries: number;
  /** 最大メモリ使用量（バイト） */
  maxMemoryUsage: number;
  /** TTL（ミリ秒） */
  ttl: number;
  /** 自動クリーンアップの間隔（ミリ秒） */
  cleanupInterval: number;
  /** LRU削除を有効にするか */
  enableLRU: boolean;
}

/**
 * ビルドキャッシュシステム
 */
export class BuildCache {
  private fileHashCache = new Map<string, string>();
  private parseResultCache = new Map<string, ParseResultCache>();
  private zodAnalysisCache = new Map<string, ZodAnalysisCache>();
  private analysisResultCache = new Map<string, AnalysisResultCache>();
  
  private stats: CacheStats = {
    totalEntries: 0,
    memoryUsage: 0,
    hits: 0,
    misses: 0,
    hitRate: 0
  };
  
  private config: CacheConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxEntries: 1000,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      ttl: 60 * 60 * 1000, // 1時間
      cleanupInterval: 5 * 60 * 1000, // 5分
      enableLRU: true,
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * ファイルのハッシュ値を計算
   */
  async calculateFileHash(filePath: string): Promise<string> {
    try {
      const cached = this.fileHashCache.get(filePath);
      const stats = await fs.stat(filePath);
      
      // ファイルの変更時刻とサイズを含むキー
      const hashKey = `${filePath}:${stats.mtime.getTime()}:${stats.size}`;
      
      if (cached && cached.startsWith(hashKey)) {
        // キャッシュされたハッシュを返す
        const parts = cached.split(':');
        return parts[3] || '';
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      this.fileHashCache.set(filePath, `${hashKey}:${hash}`);
      return hash;
      
    } catch (error) {
      // ファイルが存在しない場合は削除されたものとして扱う
      this.fileHashCache.delete(filePath);
      throw error;
    }
  }

  /**
   * 解析結果をキャッシュから取得
   */
  async getParseResult(filePath: string): Promise<PackageInfo | null> {
    const cached = this.parseResultCache.get(filePath);
    
    if (!cached) {
      this.recordMiss();
      return null;
    }

    try {
      const currentHash = await this.calculateFileHash(filePath);
      
      // ハッシュが一致し、TTL内であればキャッシュを使用
      if (cached.hash === currentHash && this.isWithinTTL(cached.timestamp)) {
        this.recordHit();
        this.updateAccess(cached);
        return cached.data;
      }
      
      // キャッシュが古い場合は削除
      this.parseResultCache.delete(filePath);
      this.recordMiss();
      return null;
      
    } catch (error) {
      // ファイルが存在しない場合はキャッシュを削除
      this.parseResultCache.delete(filePath);
      this.recordMiss();
      return null;
    }
  }

  /**
   * 解析結果をキャッシュに保存
   */
  async setParseResult(
    filePath: string, 
    result: PackageInfo, 
    dependencies: string[] = [],
    _options?: ParseOptions
  ): Promise<void> {
    try {
      const hash = await this.calculateFileHash(filePath);
      const now = new Date();
      
      const cacheEntry: ParseResultCache = {
        data: result,
        hash,
        timestamp: now,
        dependencies,
        accessCount: 1,
        lastAccessed: now,
        compilerOptionsHash: _options ? this.hashObject(_options) : ''
      };
      
      this.parseResultCache.set(filePath, cacheEntry);
      this.updateStats();
      
    } catch (error) {
      console.warn(`[BuildCache] 解析結果のキャッシュに失敗: ${filePath}`, error);
    }
  }

  /**
   * Zod解析結果をキャッシュから取得
   */
  async getZodAnalysisResult(targetPath: string, optionsHash: string): Promise<ZodObjectInfo[] | null> {
    const cached = this.zodAnalysisCache.get(targetPath);
    
    if (!cached) {
      this.recordMiss();
      return null;
    }

    // オプションが変更されていないかチェック
    if (cached.optionsHash === optionsHash && this.isWithinTTL(cached.timestamp)) {
      this.recordHit();
      this.updateAccess(cached);
      return cached.data;
    }

    this.zodAnalysisCache.delete(targetPath);
    this.recordMiss();
    return null;
  }

  /**
   * Zod解析結果をキャッシュに保存
   */
  setZodAnalysisResult(
    targetPath: string, 
    result: ZodObjectInfo[], 
    optionsHash: string,
    dependencies: string[] = []
  ): void {
    const now = new Date();
    
    const cacheEntry: ZodAnalysisCache = {
      data: result,
      hash: optionsHash, // Zodの場合はオプションハッシュを使用
      timestamp: now,
      dependencies,
      accessCount: 1,
      lastAccessed: now,
      optionsHash
    };
    
    this.zodAnalysisCache.set(targetPath, cacheEntry);
    this.updateStats();
  }

  /**
   * 完全な解析結果をキャッシュから取得
   */
  getAnalysisResult(key: string): AnalysisResult | null {
    const cached = this.analysisResultCache.get(key);
    
    if (!cached) {
      this.recordMiss();
      return null;
    }

    if (this.isWithinTTL(cached.timestamp)) {
      this.recordHit();
      this.updateAccess(cached);
      return cached.data;
    }

    this.analysisResultCache.delete(key);
    this.recordMiss();
    return null;
  }

  /**
   * 完全な解析結果をキャッシュに保存
   */
  setAnalysisResult(
    key: string, 
    result: AnalysisResult, 
    dependencies: string[] = [],
    analysisTime: number = 0
  ): void {
    const now = new Date();
    
    const cacheEntry: AnalysisResultCache = {
      data: result,
      hash: this.hashObject(result.statistics),
      timestamp: now,
      dependencies,
      accessCount: 1,
      lastAccessed: now,
      fileCount: result.statistics.totalFiles,
      analysisTime
    };
    
    this.analysisResultCache.set(key, cacheEntry);
    this.updateStats();
  }

  /**
   * 指定されたファイルのキャッシュを無効化
   */
  invalidate(filePath: string): void {
    // 直接のキャッシュを削除
    this.parseResultCache.delete(filePath);
    this.fileHashCache.delete(filePath);
    
    // 依存関係のあるキャッシュも無効化
    this.invalidateDependents(filePath);
    
    console.log(`[BuildCache] キャッシュを無効化: ${filePath}`);
  }

  /**
   * 依存関係のあるキャッシュを無効化
   */
  private invalidateDependents(filePath: string): void {
    const normalizedPath = path.normalize(filePath);
    
    // 解析結果キャッシュの依存関係をチェック
    for (const [path, entry] of this.parseResultCache) {
      if (entry.dependencies.some(dep => path.normalize(dep) === normalizedPath)) {
        this.parseResultCache.delete(path);
      }
    }
    
    // Zod解析キャッシュの依存関係をチェック
    for (const [path, entry] of this.zodAnalysisCache) {
      if (entry.dependencies.some(dep => path.normalize(dep) === normalizedPath)) {
        this.zodAnalysisCache.delete(path);
      }
    }
    
    // 完全解析キャッシュの依存関係をチェック
    for (const [key, entry] of this.analysisResultCache) {
      if (entry.dependencies.some(dep => path.normalize(dep) === normalizedPath)) {
        this.analysisResultCache.delete(key);
      }
    }
  }

  /**
   * 古いキャッシュエントリを削除
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    let deletedCount = 0;

    // TTL切れのエントリを削除
    const cleanupMap = <T>(cache: Map<string, CacheEntry<T>>): void => {
      for (const [key, entry] of cache) {
        if (!this.isWithinTTL(entry.timestamp)) {
          cache.delete(key);
          deletedCount++;
        }
      }
    };

    cleanupMap(this.parseResultCache);
    cleanupMap(this.zodAnalysisCache);
    cleanupMap(this.analysisResultCache);

    // メモリ使用量が上限を超えている場合はLRU削除
    if (this.config.enableLRU && this.isMemoryExceeded()) {
      deletedCount += this.performLRUCleanup();
    }

    this.updateStats();
    this.stats.lastCleanup = now;
    
    if (deletedCount > 0) {
      console.log(`[BuildCache] クリーンアップ完了: ${deletedCount}個のエントリを削除`);
    }
  }

  /**
   * すべてのキャッシュをクリア
   */
  clear(): void {
    this.fileHashCache.clear();
    this.parseResultCache.clear();
    this.zodAnalysisCache.clear();
    this.analysisResultCache.clear();
    
    this.stats = {
      totalEntries: 0,
      memoryUsage: 0,
      hits: 0,
      misses: 0,
      hitRate: 0
    };
    
    console.log('[BuildCache] 全キャッシュをクリアしました');
  }

  /**
   * キャッシュ統計情報を取得
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * キャッシュを停止（クリーンアップタイマーを停止）
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * TTL以内かどうかをチェック
   */
  private isWithinTTL(timestamp: Date): boolean {
    return Date.now() - timestamp.getTime() < this.config.ttl;
  }

  /**
   * オブジェクトのハッシュ値を計算
   */
  private hashObject(obj: unknown): string {
    try {
      const objToHash = obj && typeof obj === 'object' ? obj : {};
      return crypto.createHash('sha256')
        .update(JSON.stringify(objToHash, Object.keys(objToHash as object).sort()))
        .digest('hex');
    } catch {
      return crypto.createHash('sha256').update('{}').digest('hex');
    }
  }

  /**
   * キャッシュヒットを記録
   */
  private recordHit(): void {
    this.stats.hits++;
    this.updateHitRate();
  }

  /**
   * キャッシュミスを記録
   */
  private recordMiss(): void {
    this.stats.misses++;
    this.updateHitRate();
  }

  /**
   * ヒット率を更新
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * アクセス情報を更新
   */
  private updateAccess<T>(entry: CacheEntry<T>): void {
    entry.accessCount++;
    entry.lastAccessed = new Date();
  }

  /**
   * 統計情報を更新
   */
  private updateStats(): void {
    this.stats.totalEntries = 
      this.parseResultCache.size + 
      this.zodAnalysisCache.size + 
      this.analysisResultCache.size;
    
    // 概算メモリ使用量を計算
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  /**
   * メモリ使用量を概算
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    const estimateEntrySize = <T>(entry: CacheEntry<T>): number => {
      return JSON.stringify(entry).length * 2; // 概算（UTF-16）
    };

    for (const entry of this.parseResultCache.values()) {
      totalSize += estimateEntrySize(entry);
    }
    
    for (const entry of this.zodAnalysisCache.values()) {
      totalSize += estimateEntrySize(entry);
    }
    
    for (const entry of this.analysisResultCache.values()) {
      totalSize += estimateEntrySize(entry);
    }

    return totalSize;
  }

  /**
   * メモリ使用量が上限を超えているかチェック
   */
  private isMemoryExceeded(): boolean {
    return this.stats.memoryUsage > this.config.maxMemoryUsage;
  }

  /**
   * LRUアルゴリズムによるクリーンアップ
   */
  private performLRUCleanup(): number {
    let deletedCount = 0;
    const targetReduction = this.config.maxMemoryUsage * 0.2; // 20%削減
    let currentReduction = 0;

    // 全エントリを最終アクセス時刻でソート
    const allEntries: Array<{ key: string; entry: CacheEntry<unknown>; cache: string }> = [];
    
    for (const [key, entry] of this.parseResultCache) {
      allEntries.push({ key, entry, cache: 'parse' });
    }
    for (const [key, entry] of this.zodAnalysisCache) {
      allEntries.push({ key, entry, cache: 'zod' });
    }
    for (const [key, entry] of this.analysisResultCache) {
      allEntries.push({ key, entry, cache: 'analysis' });
    }

    // 最終アクセス時刻でソート（古い順）
    allEntries.sort((a, b) => a.entry.lastAccessed.getTime() - b.entry.lastAccessed.getTime());

    // 古いエントリから削除
    for (const { key, entry, cache } of allEntries) {
      if (currentReduction >= targetReduction) break;

      const entrySize = JSON.stringify(entry).length * 2;
      
      switch (cache) {
        case 'parse':
          this.parseResultCache.delete(key);
          break;
        case 'zod':
          this.zodAnalysisCache.delete(key);
          break;
        case 'analysis':
          this.analysisResultCache.delete(key);
          break;
      }
      
      currentReduction += entrySize;
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * 定期クリーンアップタイマーを開始
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        console.warn('[BuildCache] 自動クリーンアップでエラーが発生:', error);
      });
    }, this.config.cleanupInterval);
  }
}

/**
 * デフォルトのビルドキャッシュインスタンス
 */
export const buildCache = new BuildCache();