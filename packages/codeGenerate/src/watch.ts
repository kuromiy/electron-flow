/**
 * Phase 6: 効率的なファイル監視システム
 * chokidarベースの高性能ファイル監視とデバウンス処理を実装
 */

import chokidar from 'chokidar';
import { BuildManager } from './build.js';
import type { AutoCodeOption } from './index.js';
import type { ExtendedAutoCodeOption } from './config.js';

/**
 * ファイル変更イベントの種類
 */
export type FileChangeType = 'add' | 'change' | 'unlink';

/**
 * ファイル変更イベント
 */
export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  timestamp: number;
}

/**
 * ビルドキューアイテム
 */
export interface BuildQueueItem {
  changes: FileChangeEvent[];
  timestamp: number;
  priority: 'normal' | 'high';
}

/**
 * 監視ハンドル
 */
export interface WatchHandle {
  stop(): Promise<void>;
  isWatching(): boolean;
  getStats(): WatcherStats;
}

/**
 * 監視統計情報
 */
export interface WatcherStats {
  totalBuilds: number;
  successfulBuilds: number;
  failedBuilds: number;
  averageBuildTime: number;
  lastBuildTime?: number;
  watchedFiles: number;
}

/**
 * ビルドキュー管理クラス
 */
class BuildQueue {
  private queue: BuildQueueItem[] = [];
  private pendingChanges: FileChangeEvent[] = [];
  private hasPendingFlag = false;

  /**
   * 変更をキューに追加
   */
  add(change: FileChangeEvent): void {
    this.pendingChanges.push(change);
  }

  /**
   * ペンディング状態をマーク
   */
  markPending(): void {
    this.hasPendingFlag = true;
  }

  /**
   * キューをフラッシュして変更を取得
   */
  flush(): FileChangeEvent[] {
    const changes = [...this.pendingChanges];
    this.pendingChanges = [];
    this.hasPendingFlag = false;
    return changes;
  }

  /**
   * ペンディング変更があるかチェック
   */
  hasPending(): boolean {
    return this.hasPendingFlag || this.pendingChanges.length > 0;
  }

  /**
   * キューをクリア
   */
  clear(): void {
    this.queue = [];
    this.pendingChanges = [];
    this.hasPendingFlag = false;
  }
}

/**
 * デバウンス関数のユーティリティ
 */
function debounce<T extends unknown[]>(
  func: (...args: T) => void | Promise<void>,
  delay: number
): (...args: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 効率的なファイル監視システム
 */
export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private buildQueue: BuildQueue = new BuildQueue();
  private buildManager: BuildManager;
  private isBuilding = false;
  private stats: WatcherStats = {
    totalBuilds: 0,
    successfulBuilds: 0,
    failedBuilds: 0,
    averageBuildTime: 0,
    watchedFiles: 0
  };
  private debouncedBuild: (() => void) | null = null;
  private option: ExtendedAutoCodeOption | null = null;

  constructor(buildManager?: BuildManager) {
    this.buildManager = buildManager || new BuildManager();
  }

  /**
   * ファイル監視を開始
   */
  async startWatching(option: AutoCodeOption): Promise<WatchHandle> {
    if (this.watcher) {
      throw new Error('既にファイル監視が開始されています');
    }

    // 設定を拡張形式に変換
    this.option = {
      ...option,
      logLevel: 'info',
      advanced: {
        concurrency: 4,
        verbose: false,
        createBackup: false,
        excludePatterns: []
      }
    };

    this.watcher = chokidar.watch(option.targetPath, {
      ignored: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/.git/**',
        '**/.vscode/**',
        '**/dist/**',
        '**/build/**',
        ...option.ignores.map(pattern => `**/${pattern}`)
      ],
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 10,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });

    this.setupEventHandlers();
    this.debouncedBuild = debounce(this.executeBuild.bind(this), 300);

    console.log(`[electron-flow] ファイル監視を開始: ${option.targetPath}`);

    return new WatchHandleImpl(this);
  }

  /**
   * ファイル監視を停止
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.buildQueue.clear();
      this.debouncedBuild = null;
      console.log('[electron-flow] ファイル監視を停止しました');
    }
  }

  /**
   * 監視中かどうかを確認
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }

  /**
   * 統計情報を取得
   */
  getStats(): WatcherStats {
    return { ...this.stats };
  }

  /**
   * イベントハンドラーの設定
   */
  private setupEventHandlers(): void {
    if (!this.watcher || !this.debouncedBuild) return;

    this.watcher
      .on('add', (filePath) => {
        this.handleFileChange('add', filePath);
      })
      .on('change', (filePath) => {
        this.handleFileChange('change', filePath);
      })
      .on('unlink', (filePath) => {
        this.handleFileChange('unlink', filePath);
      })
      .on('ready', () => {
        const watchedPaths = this.watcher?.getWatched();
        this.stats.watchedFiles = watchedPaths ? Object.keys(watchedPaths).length : 0;
        console.log(`[electron-flow] 監視準備完了 (${this.stats.watchedFiles} ファイル)`);
      })
      .on('error', (error) => {
        console.error('[electron-flow] ファイル監視エラー:', error);
      });
  }

  /**
   * ファイル変更ハンドラー
   */
  private handleFileChange(type: FileChangeType, filePath: string): void {
    const change: FileChangeEvent = {
      type,
      path: filePath,
      timestamp: Date.now()
    };

    this.buildQueue.add(change);
    
    if (this.debouncedBuild) {
      this.debouncedBuild();
    }

    console.log(`[electron-flow] ファイル変更検知: ${type} ${filePath}`);
  }

  /**
   * ビルド実行（デバウンス済み）
   */
  private async executeBuild(): Promise<void> {
    if (this.isBuilding) {
      this.buildQueue.markPending();
      return;
    }

    if (!this.option) {
      console.error('[electron-flow] オプションが設定されていません');
      return;
    }

    this.isBuilding = true;
    const startTime = Date.now();

    try {
      const changes = this.buildQueue.flush();
      
      if (changes.length === 0) {
        return;
      }

      console.log(`[electron-flow] 自動ビルド開始 (${changes.length} 変更)`);
      
      const result = await this.buildManager.build(this.option);
      
      const buildTime = Date.now() - startTime;
      this.updateStats(true, buildTime);
      
      if (result.success) {
        console.log(`[electron-flow] ビルド完了 (${buildTime}ms)`);
      } else {
        console.error('[electron-flow] ビルド失敗:', result.errors);
      }

    } catch (error) {
      const buildTime = Date.now() - startTime;
      this.updateStats(false, buildTime);
      console.error('[electron-flow] ビルドエラー:', error);
    } finally {
      this.isBuilding = false;
      
      // ペンディング中の変更がある場合は次のビルドをスケジュール
      if (this.buildQueue.hasPending()) {
        setTimeout(() => this.executeBuild(), 100);
      }
    }
  }

  /**
   * 統計情報を更新
   */
  private updateStats(success: boolean, buildTime: number): void {
    this.stats.totalBuilds++;
    
    if (success) {
      this.stats.successfulBuilds++;
    } else {
      this.stats.failedBuilds++;
    }
    
    // 平均ビルド時間を更新
    const totalTime = (this.stats.averageBuildTime * (this.stats.totalBuilds - 1)) + buildTime;
    this.stats.averageBuildTime = totalTime / this.stats.totalBuilds;
    
    this.stats.lastBuildTime = buildTime;
  }
}

/**
 * 監視ハンドルの実装
 */
class WatchHandleImpl implements WatchHandle {
  constructor(private readonly fileWatcher: FileWatcher) {}

  async stop(): Promise<void> {
    await this.fileWatcher.stopWatching();
  }

  isWatching(): boolean {
    return this.fileWatcher.isWatching();
  }

  getStats(): WatcherStats {
    return this.fileWatcher.getStats();
  }
}

/**
 * デフォルトのファイルウォッチャーインスタンス
 */
export const fileWatcher = new FileWatcher();
