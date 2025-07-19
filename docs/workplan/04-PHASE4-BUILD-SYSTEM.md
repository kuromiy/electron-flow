# Phase 4: ビルドシステム

## 1. フェーズ概要

### 目標
Phase 2-3で実装した解析・生成機能を統合し、設定ファイルに基づいた完全なビルドプロセスを構築する。エラーハンドリング、設定管理、ファイル出力を統合した堅牢なシステムを実現する。

### 期間
**1週間** (5営業日)

### 主要成果物
- **build.ts**: ビルドプロセス管理
- **config.ts**: 設定管理システム
- **fileManager.ts**: ファイル操作管理
- エラーリカバリー機能
- 包括的な統合テスト

## 2. 詳細タスクリスト

### タスク 4.1: 設定管理システム (Day 1)
**所要時間**: 6時間

**設定ファイル検証と読み込み**:
```typescript
interface AutoCodeOption {
  targetPath: string;
  ignores: string[];
  preloadPath: string;
  registerPath: string;
  rendererPath: string;
  contextPath?: string;
  errorHandler?: ErrorHandlerConfig;
  advanced?: AdvancedOptions;
}

class ConfigManager {
  async loadConfig(configPath: string): Promise<AutoCodeOption> {
    const config = await import(path.resolve(configPath));
    return this.validateAndNormalize(config.autoCodeOption);
  }
  
  private validateAndNormalize(config: any): AutoCodeOption {
    // 必須フィールドの検証
    this.validateRequiredFields(config);
    
    // パスの正規化
    const normalized = {
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
}
```

**完了基準**: 設定ファイルの検証、正規化、デフォルト値適用が動作する

### タスク 4.2: ファイル管理システム (Day 2)
**所要時間**: 6時間

**安全なファイル操作**:
```typescript
class FileManager {
  async writeGeneratedFile(
    filePath: string, 
    content: string, 
    options: WriteOptions = {}
  ): Promise<void> {
    // ディレクトリの作成
    await this.ensureDirectory(path.dirname(filePath));
    
    // バックアップの作成（オプション）
    if (options.createBackup && await this.fileExists(filePath)) {
      await this.createBackup(filePath);
    }
    
    // アトミック書き込み
    const tempFile = `${filePath}.tmp`;
    await fs.writeFile(tempFile, content, 'utf8');
    await fs.rename(tempFile, filePath);
    
    this.logFileOperation('write', filePath);
  }
  
  async scanTargetFiles(
    targetPath: string, 
    ignores: string[]
  ): Promise<string[]> {
    const files = await glob('**/*.ts', {
      cwd: targetPath,
      ignore: ['**/*.d.ts', '**/__tests__/**', ...ignores]
    });
    
    return files.map(file => path.join(targetPath, file));
  }
}
```

**完了基準**: 安全で効率的なファイル操作機能が実装される

### タスク 4.3: ビルドプロセス統合 (Day 3)
**所要時間**: 6時間

**メインビルド機能**:
```typescript
class BuildManager {
  async build(option: AutoCodeOption): Promise<BuildResult> {
    const logger = this.createLogger(option.advanced?.logLevel);
    
    try {
      logger.info('Starting build process');
      
      // Phase 1: ファイル収集
      const files = await this.fileManager.scanTargetFiles(
        option.targetPath, 
        option.ignores
      );
      logger.info(`Found ${files.length} files to analyze`);
      
      // Phase 2: 解析
      const parseResult = await this.analyzeFiles(files);
      logger.info(`Extracted ${parseResult.functions.length} functions`);
      
      // Phase 3: コード生成
      const generatedCode = await this.generateCode(parseResult, option);
      
      // Phase 4: ファイル出力
      await this.writeGeneratedFiles(generatedCode, option);
      
      return {
        success: true,
        stats: this.generateStats(parseResult, generatedCode),
        generatedFiles: generatedCode.map(c => c.outputPath)
      };
      
    } catch (error) {
      logger.error('Build failed', error);
      return this.handleBuildError(error, option);
    }
  }
  
  private async analyzeFiles(files: string[]): Promise<AnalysisResult> {
    const packages = await this.parser.parseFiles(files);
    const zodSchemas = await this.zodAnalyzer.analyzeFiles(files);
    
    return { packages, zodSchemas };
  }
  
  private async generateCode(
    analysis: AnalysisResult, 
    option: AutoCodeOption
  ): Promise<GeneratedCode[]> {
    return [
      {
        type: 'preload',
        content: this.preloadGenerator.generate(analysis.packages),
        outputPath: option.preloadPath
      },
      {
        type: 'handler',
        content: this.handlerGenerator.generate(
          analysis.packages, 
          analysis.zodSchemas,
          option.errorHandler
        ),
        outputPath: option.registerPath
      },
      {
        type: 'types',
        content: this.typeGenerator.generate(
          analysis.packages, 
          analysis.zodSchemas
        ),
        outputPath: option.rendererPath
      }
    ];
  }
}
```

**完了基準**: 完全なビルドプロセスが動作し、設定に基づいてコードが生成される

### タスク 4.4: エラーハンドリングとリカバリー (Day 4)
**所要時間**: 6時間

**堅牢なエラー処理**:
```typescript
class ErrorHandler {
  handleBuildError(error: Error, context: BuildContext): BuildResult {
    const errorCategory = this.categorizeError(error);
    
    switch (errorCategory) {
      case 'CONFIG_ERROR':
        return this.handleConfigError(error as ConfigError);
      
      case 'PARSE_ERROR':
        return this.handleParseError(error as ParseError, context);
      
      case 'GENERATION_ERROR':
        return this.handleGenerationError(error as GenerationError);
      
      case 'FILE_SYSTEM_ERROR':
        return this.handleFileSystemError(error as FileSystemError);
      
      default:
        return this.handleUnknownError(error);
    }
  }
  
  private handleParseError(error: ParseError, context: BuildContext): BuildResult {
    // 部分的な成功の試行
    const partialResult = this.attemptPartialBuild(context, error.filePath);
    
    return {
      success: false,
      error: {
        type: 'PARSE_ERROR',
        message: error.message,
        file: error.filePath,
        suggestions: this.getParseErrorSuggestions(error)
      },
      partialResult
    };
  }
  
  private getParseErrorSuggestions(error: ParseError): string[] {
    const suggestions = [];
    
    if (error.message.includes('syntax')) {
      suggestions.push('Check TypeScript syntax in the file');
      suggestions.push('Ensure all imports are properly resolved');
    }
    
    if (error.message.includes('type')) {
      suggestions.push('Verify type definitions are correctly exported');
      suggestions.push('Check for circular dependencies');
    }
    
    return suggestions;
  }
}
```

**完了基準**: エラーケースに対する適切な処理とリカバリー機能が実装される

### タスク 4.5: 統合確認とパフォーマンス検証 (Day 5)
**所要時間**: 6時間

**包括的な動作確認**:
```typescript
// 完全なビルドプロセスの動作確認
async function verifyFullBuildProcess() {
  const config: AutoCodeOption = {
    targetPath: './examples/api',
    ignores: [],
    preloadPath: './output/preload.ts',
    registerPath: './output/handlers.ts',
    rendererPath: './output/types.d.ts'
  };
  
  console.log('=== ビルドプロセス動作確認 ===');
  const result = await buildManager.build(config);
  
  console.log('Build success:', result.success);
  console.log('Generated files:', result.generatedFiles?.length);
  
  // 生成されたファイルの確認
  if (result.generatedFiles) {
    for (const filePath of result.generatedFiles) {
      const exists = await fs.pathExists(filePath);
      console.log(`File exists (${filePath}):`, exists);
    }
  }
}

// エラーケースの動作確認
async function verifyErrorHandling() {
  // エラーケースの手動確認
  console.log('=== エラーハンドリング確認 ===');
  // 無効な設定やファイルパスでのエラーハンドリングを手動確認
}

// パフォーマンス確認
async function verifyPerformance() {
  console.log('=== パフォーマンス確認 ===');
  const startTime = Date.now();
  
  // 大量ファイルでのビルド時間を手動測定
  
  const duration = Date.now() - startTime;
  console.log('Build duration:', duration, 'ms');
  console.log('Performance requirement (5000ms):', duration < 5000 ? '✅ PASS' : '❌ FAIL');
}

// すべての動作確認を実行
async function runAllVerifications() {
  await verifyFullBuildProcess();
  await verifyErrorHandling();
  await verifyPerformance();
}
```

**完了基準**: すべての動作確認が成功し、パフォーマンス要件を満たす

## 3. 技術要件

### 3.1 依存関係
- **glob**: ファイル検索
- **fs-extra**: ファイル操作
- **path**: パス操作
- **winston**: ロギング（オプション）

### 3.2 パフォーマンス要件
- **ビルド時間**: 100ファイル未満で5秒以内
- **メモリ使用量**: 300MB以内
- **エラーリカバリー**: 1秒以内の応答

### 3.3 品質要件
- **エラーハンドリング**: すべてのエラーケースに対応
- **ロギング**: 詳細な実行ログ
- **設定検証**: 不正な設定の検出と報告

## 4. 完了基準

### 4.1 必須基準
- [ ] 設定ファイルから完全なビルドプロセスが実行可能
- [ ] エラー発生時の適切なエラーメッセージとリカバリー
- [ ] 3種類の生成ファイルすべてが正常に出力
- [ ] パフォーマンス要件をクリア
- [ ] 手動動作確認が完了

### 4.2 推奨基準
- [ ] 部分的な失敗に対するリカバリー機能
- [ ] 詳細なビルド統計とログ出力
- [ ] 設定の詳細検証とヘルプメッセージ

## 5. 次フェーズへの引き継ぎ

### 5.1 Phase 5への準備
- CLIインターフェースから呼び出し可能なAPI確認
- 設定ファイル生成機能の仕様検討
- コマンドライン引数との連携方法確認

### 5.2 成果物
- **build.ts**: 完全なビルド管理システム
- **config.ts**: 設定管理機能
- **動作確認レポート**: 包括的な検証結果

### 5.3 移行判定基準
- すべての完了基準をクリア
- 実際のプロジェクトでのビルド成功実績
- Phase 5でのCLI統合準備完了