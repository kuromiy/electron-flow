# Phase 6: 最適化・監視機能

## 1. フェーズ概要

### 目標
パフォーマンス最適化とファイル監視機能を実装し、大規模プロジェクトでの実用的な処理速度と開発体験を実現する。キャッシュシステム、差分ビルド、効率的なファイル監視を中心とした最適化を行う。

### 期間
**1週間** (5営業日)

### 主要成果物
- **watch.ts**: ファイル監視システム
- **cache.ts**: キャッシュシステム
- **performance.ts**: パフォーマンス監視
- 差分ビルド機能
- メモリ使用量最適化

## 2. 詳細タスクリスト

### タスク 6.1: ファイル監視システム (Day 1-2)
**所要時間**: 12時間

**効率的なファイル監視**:
```typescript
class FileWatcher {
  private watcher: chokidar.FSWatcher;
  private buildQueue: BuildQueue;
  private isBuilding: boolean = false;
  
  async startWatching(option: AutoCodeOption): Promise<WatchHandle> {
    this.watcher = chokidar.watch(option.targetPath, {
      ignored: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/.git/**',
        ...option.ignores.map(pattern => `**/${pattern}`)
      ],
      persistent: true,
      ignoreInitial: true
    });
    
    this.setupEventHandlers();
    return new WatchHandle(this);
  }
  
  private setupEventHandlers(): void {
    const debouncedBuild = debounce(this.executeBuild.bind(this), 300);
    
    this.watcher
      .on('add', (filePath) => {
        this.buildQueue.add({ type: 'add', path: filePath });
        debouncedBuild();
      })
      .on('change', (filePath) => {
        this.buildQueue.add({ type: 'change', path: filePath });
        debouncedBuild();
      })
      .on('unlink', (filePath) => {
        this.buildQueue.add({ type: 'delete', path: filePath });
        this.cache.invalidate(filePath);
        debouncedBuild();
      });
  }
  
  private async executeBuild(): Promise<void> {
    if (this.isBuilding) {
      this.buildQueue.markPending();
      return;
    }
    
    this.isBuilding = true;
    
    try {
      const changes = this.buildQueue.flush();
      await this.performIncrementalBuild(changes);
    } finally {
      this.isBuilding = false;
      
      if (this.buildQueue.hasPending()) {
        // 次のビルドをスケジュール
        setTimeout(() => this.executeBuild(), 100);
      }
    }
  }
}
```

**完了基準**: ファイル変更の効率的な検知と自動ビルドが動作する

### タスク 6.2: キャッシュシステム (Day 2-3)
**所要時間**: 12時間

**多層キャッシュ実装**:
```typescript
interface CacheEntry<T> {
  data: T;
  hash: string;
  timestamp: Date;
  dependencies: string[];
}

class BuildCache {
  private fileHashCache = new Map<string, string>();
  private parseResultCache = new Map<string, CacheEntry<ParseResult>>();
  private analysisCache = new Map<string, CacheEntry<AnalysisResult>>();
  
  async getParseResult(filePath: string): Promise<ParseResult | null> {
    const currentHash = await this.calculateFileHash(filePath);
    const cached = this.parseResultCache.get(filePath);
    
    if (cached && cached.hash === currentHash) {
      return cached.data;
    }
    
    return null;
  }
  
  async setParseResult(
    filePath: string, 
    result: ParseResult, 
    dependencies: string[] = []
  ): Promise<void> {
    const hash = await this.calculateFileHash(filePath);
    
    this.parseResultCache.set(filePath, {
      data: result,
      hash,
      timestamp: new Date(),
      dependencies
    });
  }
  
  invalidate(filePath: string): void {
    this.parseResultCache.delete(filePath);
    this.analysisCache.delete(filePath);
    
    // 依存関係のあるファイルも無効化
    this.invalidateDependents(filePath);
  }
  
  private invalidateDependents(filePath: string): void {
    for (const [path, entry] of this.parseResultCache) {
      if (entry.dependencies.includes(filePath)) {
        this.invalidate(path);
      }
    }
  }
  
  async calculateFileHash(filePath: string): Promise<string> {
    const cached = this.fileHashCache.get(filePath);
    const stats = await fs.stat(filePath);
    
    const hashKey = `${filePath}:${stats.mtime.getTime()}:${stats.size}`;
    
    if (cached && cached.startsWith(hashKey)) {
      return cached.split(':')[3];
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    
    this.fileHashCache.set(filePath, `${hashKey}:${hash}`);
    return hash;
  }
}
```

**完了基準**: 効果的なキャッシュによりビルド時間が大幅短縮される

### タスク 6.3: 差分ビルド機能 (Day 3-4)
**所要時間**: 12時間

**インクリメンタルビルド**:
```typescript
class IncrementalBuilder {
  constructor(
    private cache: BuildCache,
    private parser: ASTParser,
    private generator: CodeGenerator
  ) {}
  
  async performIncrementalBuild(
    changes: FileChangeEvent[],
    option: AutoCodeOption
  ): Promise<IncrementalBuildResult> {
    const affectedFiles = await this.analyzeAffectedFiles(changes);
    const buildPlan = await this.createBuildPlan(affectedFiles, option);
    
    const results = await this.executeBuildPlan(buildPlan);
    
    return {
      success: true,
      processedFiles: affectedFiles.length,
      regeneratedOutputs: results.regeneratedOutputs,
      duration: results.duration
    };
  }
  
  private async analyzeAffectedFiles(
    changes: FileChangeEvent[]
  ): Promise<string[]> {
    const directlyAffected = changes.map(c => c.path);
    const dependentFiles = new Set<string>();
    
    // 依存関係を辿って影響を受けるファイルを特定
    for (const filePath of directlyAffected) {
      const dependents = await this.findDependentFiles(filePath);
      dependents.forEach(dep => dependentFiles.add(dep));
    }
    
    return [...new Set([...directlyAffected, ...dependentFiles])];
  }
  
  private async createBuildPlan(
    affectedFiles: string[],
    option: AutoCodeOption
  ): Promise<BuildPlan> {
    const plan: BuildPlan = {
      filesToParse: [],
      outputsToRegenerate: new Set()
    };
    
    for (const filePath of affectedFiles) {
      const cached = await this.cache.getParseResult(filePath);
      if (!cached) {
        plan.filesToParse.push(filePath);
      }
      
      // このファイルの変更がどの出力に影響するかを判定
      const affectedOutputs = this.determineAffectedOutputs(filePath, option);
      affectedOutputs.forEach(output => plan.outputsToRegenerate.add(output));
    }
    
    return plan;
  }
  
  private async executeBuildPlan(plan: BuildPlan): Promise<BuildPlanResult> {
    const startTime = Date.now();
    
    // 必要なファイルのみを解析
    const parseResults = await Promise.all(
      plan.filesToParse.map(file => this.parseWithCache(file))
    );
    
    // 影響を受ける出力のみを再生成
    const regeneratedOutputs = [];
    for (const outputType of plan.outputsToRegenerate) {
      await this.regenerateOutput(outputType);
      regeneratedOutputs.push(outputType);
    }
    
    return {
      regeneratedOutputs,
      duration: Date.now() - startTime
    };
  }
}
```

**完了基準**: 変更されたファイルのみを効率的に処理する差分ビルドが動作する

### タスク 6.4: パフォーマンス監視 (Day 4)
**所要時間**: 6時間

**メトリクス収集とモニタリング**:
```typescript
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    buildTimes: [],
    memoryUsage: [],
    fileCount: 0,
    cacheHitRate: 0
  };
  
  startBuildMeasurement(): PerformanceMeasurement {
    return {
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      
      end: () => {
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        
        const measurement = {
          duration: endTime - this.startTime,
          memoryDelta: endMemory.heapUsed - this.startMemory.heapUsed,
          peakMemory: endMemory.heapUsed
        };
        
        this.recordMeasurement(measurement);
        return measurement;
      }
    };
  }
  
  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }
  
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }
  
  getAverageMetrics(): AverageMetrics {
    return {
      averageBuildTime: this.calculateAverage(this.metrics.buildTimes),
      averageMemoryUsage: this.calculateAverage(this.metrics.memoryUsage),
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
      totalBuilds: this.metrics.buildTimes.length
    };
  }
  
  checkPerformanceThresholds(): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const avg = this.getAverageMetrics();
    
    if (avg.averageBuildTime > 10000) { // 10秒以上
      alerts.push({
        type: 'SLOW_BUILD',
        message: `平均ビルド時間が${avg.averageBuildTime}msです`,
        suggestion: 'キャッシュ設定を確認するか、対象ファイルを減らしてください'
      });
    }
    
    if (avg.averageMemoryUsage > 500 * 1024 * 1024) { // 500MB以上
      alerts.push({
        type: 'HIGH_MEMORY',
        message: `メモリ使用量が${Math.round(avg.averageMemoryUsage / 1024 / 1024)}MBです`,
        suggestion: 'ファイルサイズやキャッシュサイズを確認してください'
      });
    }
    
    return alerts;
  }
}
```

**完了基準**: パフォーマンスが監視され、問題が自動検出される

### タスク 6.5: メモリ最適化とベンチマーク (Day 5)
**所要時間**: 6時間

**メモリ効率化**:
```typescript
class MemoryOptimizer {
  private gcThreshold = 100 * 1024 * 1024; // 100MB
  
  async optimizeMemoryUsage(): Promise<void> {
    const usage = process.memoryUsage();
    
    if (usage.heapUsed > this.gcThreshold) {
      // 強制ガベージコレクション（開発環境のみ）
      if (global.gc && process.env.NODE_ENV === 'development') {
        global.gc();
      }
      
      // キャッシュの古いエントリを削除
      await this.cache.cleanup();
      
      // 大きなオブジェクトの参照をクリア
      this.clearLargeReferences();
    }
  }
  
  private async runBenchmark(): Promise<BenchmarkResult> {
    const sampleSizes = [10, 50, 100, 200];
    const results: BenchmarkMeasurement[] = [];
    
    for (const fileCount of sampleSizes) {
      const sampleProject = await this.createSampleProject(fileCount);
      const measurement = await this.measureBuildTime(sampleProject);
      
      results.push({
        fileCount,
        buildTime: measurement.duration,
        memoryUsage: measurement.peakMemory,
        cacheHitRate: measurement.cacheHitRate
      });
    }
    
    return { measurements: results };
  }
}
```

**完了基準**: メモリ使用量が最適化され、ベンチマーク結果が基準を満たす

## 3. パフォーマンス目標

### 3.1 ビルド時間
- **小規模プロジェクト** (〜20ファイル): 1秒以内
- **中規模プロジェクト** (〜100ファイル): 5秒以内
- **大規模プロジェクト** (200+ファイル): 15秒以内

### 3.2 メモリ使用量
- **最大メモリ使用量**: 500MB以内
- **キャッシュサイズ**: 100MB以内
- **メモリリーク**: 検出されないこと

### 3.3 監視機能
- **ファイル変更検知**: 100ms以内
- **ビルド開始**: 変更検知から300ms以内
- **キャッシュヒット率**: 80%以上

## 4. 完了基準

### 4.1 必須基準
- [ ] ファイル監視が安定動作し、自動ビルドが実行される
- [ ] キャッシュシステムによりビルド時間が50%以上短縮
- [ ] 差分ビルドが正確に動作する
- [ ] メモリ使用量が目標値以内に収まる
- [ ] パフォーマンスベンチマークが目標を達成

### 4.2 推奨基準
- [ ] パフォーマンス問題の自動検出とアラート
- [ ] 詳細なメトリクス収集
- [ ] 開発者向けのパフォーマンス分析ツール

## 5. 次フェーズへの引き継ぎ

### 5.1 Phase 7への準備
- ドキュメント作成に向けた成果物の整理
- パフォーマンス最適化結果の記録
- 最終検証項目の確認

### 5.2 成果物
- **watch.ts**: 完全に動作するファイル監視システム
- **cache.ts**: 効率的なキャッシュシステム
- **パフォーマンス最適化**: 目標値を達成した高速ビルド

### 5.3 移行判定基準
- すべての完了基準をクリア
- 大規模プロジェクトでのパフォーマンス実績
- 安定した監視機能の動作確認