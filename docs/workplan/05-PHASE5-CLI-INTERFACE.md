# Phase 5: CLIインターフェース

## 1. フェーズ概要

### 目標
ユーザーが簡単にelectron-flowを使用できるコマンドラインインターフェース（CLI）を実装する。`init`コマンドと`gen`コマンドを中心とした直感的で使いやすいCLIを提供する。

### 期間
**1週間** (5営業日)

### 主要成果物
- **cli/src/commands/init.ts**: プロジェクト初期化コマンド
- **cli/src/commands/gen.ts**: コード生成コマンド
- **cli/src/index.ts**: CLI エントリーポイント
- **bin/electron-flow**: 実行可能スクリプト
- ユーザー向けヘルプとエラーメッセージ

## 2. 詳細タスクリスト

### タスク 5.1: CLI基盤とコマンド解析 (Day 1)
**所要時間**: 6時間

**CLI フレームワーク選定と基盤構築**:
```typescript
// Commander.js を使用したCLI実装
import { Command } from 'commander';

class ElectronFlowCLI {
  private program: Command;
  
  constructor() {
    this.program = new Command();
    this.setupGlobalOptions();
    this.registerCommands();
  }
  
  private setupGlobalOptions(): void {
    this.program
      .name('electron-flow')
      .description('TypeScript APIから自動でIPC通信コードを生成')
      .version(require('../package.json').version)
      .option('--config <path>', '設定ファイルのパス', './electron-flow.config.ts')
      .option('--verbose', '詳細なログ出力', false)
      .option('--debug', 'デバッグモード', false);
  }
  
  private registerCommands(): void {
    this.program
      .addCommand(new InitCommand().getCommand())
      .addCommand(new GenCommand().getCommand());
  }
  
  async run(argv: string[]): Promise<void> {
    await this.program.parseAsync(argv);
  }
}
```

**完了基準**: 基本的なCLI構造が動作し、コマンド解析が可能

### タスク 5.2: initコマンド実装 (Day 2)
**所要時間**: 6時間

**プロジェクト初期化機能**:
```typescript
export class InitCommand {
  getCommand(): Command {
    return new Command('init')
      .description('プロジェクトを初期化し、設定ファイルを生成')
      .option('--config-path <path>', '設定ファイルの出力パス', './electron-flow.config.ts')
      .option('--context-path <path>', 'Context型定義の出力パス', './src/types/context.ts')
      .option('--force', '既存ファイルを上書き', false)
      .option('--skip-context', 'Context型定義ファイルの生成をスキップ', false)
      .action(this.execute.bind(this));
  }
  
  async execute(options: InitOptions): Promise<void> {
    const logger = new CLILogger(options.verbose);
    
    try {
      logger.info('electron-flow プロジェクトを初期化しています...');
      
      // 1. 設定ファイル生成
      await this.generateConfigFile(options);
      logger.success(`設定ファイルを生成しました: ${options.configPath}`);
      
      // 2. Context型定義生成（オプション）
      if (!options.skipContext) {
        await this.generateContextFile(options);
        logger.success(`Context型定義を生成しました: ${options.contextPath}`);
      }
      
      // 3. 初期ディレクトリ構造の作成
      await this.createDirectoryStructure(options);
      
      logger.info('\n初期化が完了しました！');
      logger.info('次のステップ:');
      logger.info('1. src/main/api/ ディレクトリにAPI関数を作成');
      logger.info('2. npx electron-flow gen でコードを生成');
      
    } catch (error) {
      logger.error('初期化に失敗しました:', error);
      process.exit(1);
    }
  }
  
  private async generateConfigFile(options: InitOptions): Promise<void> {
    const configTemplate = `import type { AutoCodeOption } from 'electron-flow';

export const autoCodeOption: AutoCodeOption = {
  targetPath: "./src/main/api",
  ignores: [],
  preloadPath: "./src/preload/autogenerate/index.ts",
  registerPath: "./src/main/register/autogenerate/index.ts",
  rendererPath: "./src/renderer/autogenerate/index.d.ts",
  contextPath: "${options.contextPath}",
  
  // オプション設定
  // errorHandler: {
  //   handlerPath: "../../errors/handler",
  //   handlerName: "customErrorHandler",
  //   defaultHandler: true
  // }
};
`;
    
    await this.writeFileWithConfirmation(options.configPath, configTemplate, options.force);
  }
}
```

**完了基準**: initコマンドが動作し、必要なファイルが正しく生成される

### タスク 5.3: genコマンド実装 (Day 3)
**所要時間**: 6時間

**コード生成コマンド**:
```typescript
export class GenCommand {
  getCommand(): Command {
    return new Command('gen')
      .description('設定に基づいてIPC通信コードを生成')
      .option('--config <path>', '設定ファイルのパス', './electron-flow.config.ts')
      .option('--watch', 'ファイル変更を監視して自動生成', false)
      .option('--dry-run', '実際のファイル生成を行わずに確認', false)
      .action(this.execute.bind(this));
  }
  
  async execute(options: GenOptions): Promise<void> {
    const logger = new CLILogger(options.verbose);
    
    try {
      // 設定ファイル読み込み
      const config = await this.loadConfig(options.config);
      logger.info(`設定ファイルを読み込みました: ${options.config}`);
      
      if (options.dryRun) {
        await this.performDryRun(config, logger);
        return;
      }
      
      if (options.watch) {
        await this.startWatchMode(config, logger);
      } else {
        await this.performSingleBuild(config, logger);
      }
      
    } catch (error) {
      this.handleBuildError(error, logger);
      process.exit(1);
    }
  }
  
  private async performSingleBuild(
    config: AutoCodeOption, 
    logger: CLILogger
  ): Promise<void> {
    logger.info('コード生成を開始しています...');
    
    const buildManager = new BuildManager();
    const result = await buildManager.build(config);
    
    if (result.success) {
      logger.success('コード生成が完了しました！');
      logger.info(`生成されたファイル:`);
      result.generatedFiles?.forEach(file => {
        logger.info(`  - ${file}`);
      });
      
      if (result.stats) {
        logger.info(`\n統計情報:`);
        logger.info(`  - 解析ファイル数: ${result.stats.filesAnalyzed}`);
        logger.info(`  - 関数数: ${result.stats.functionsFound}`);
        logger.info(`  - 実行時間: ${result.stats.duration}ms`);
      }
    } else {
      throw new Error(result.error?.message || 'ビルドに失敗しました');
    }
  }
  
  private async startWatchMode(
    config: AutoCodeOption, 
    logger: CLILogger
  ): Promise<void> {
    logger.info('ファイル監視モードを開始しています...');
    logger.info('Ctrl+C で終了します');
    
    const buildManager = new BuildManager();
    await buildManager.watchBuild(config, {
      onBuildStart: () => logger.info('ファイル変更を検知しました。ビルドを開始...'),
      onBuildComplete: (result) => {
        if (result.success) {
          logger.success('ビルドが完了しました');
        } else {
          logger.error('ビルドエラー:', result.error?.message);
        }
      },
      onBuildError: (error) => logger.error('ビルドエラー:', error.message)
    });
  }
}
```

**完了基準**: genコマンドが動作し、ビルドプロセスがCLIから実行可能

### タスク 5.4: ユーザビリティとエラーハンドリング (Day 4)
**所要時間**: 6時間

**ユーザーフレンドリーな体験**:
```typescript
class CLILogger {
  constructor(private verbose: boolean = false) {}
  
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }
  
  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }
  
  warning(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }
  
  error(message: string, error?: Error): void {
    console.log(chalk.red('✗'), message);
    if (error && this.verbose) {
      console.log(chalk.gray(error.stack));
    }
  }
  
  progress(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray('→'), message);
    }
  }
}

class ErrorHandler {
  static handleCLIError(error: Error, logger: CLILogger): void {
    if (error instanceof ConfigError) {
      logger.error('設定ファイルエラー:');
      logger.error(error.message);
      logger.info('\n解決方法:');
      logger.info('1. 設定ファイルの構文をチェック');
      logger.info('2. npx electron-flow init で設定を再生成');
    } else if (error instanceof ParseError) {
      logger.error('解析エラー:');
      logger.error(`ファイル: ${error.filePath}`);
      logger.error(`エラー: ${error.message}`);
      logger.info('\n解決方法:');
      logger.info('1. TypeScript構文をチェック');
      logger.info('2. インポート文を確認');
    } else {
      logger.error('予期しないエラーが発生しました:');
      logger.error(error.message);
      logger.info('\nサポートが必要な場合は、以下の情報と共にissueを作成してください:');
      logger.info(`- electron-flow バージョン: ${getVersion()}`);
      logger.info(`- Node.js バージョン: ${process.version}`);
      logger.info(`- OS: ${process.platform}`);
    }
  }
}
```

**完了基準**: エラーメッセージが分かりやすく、解決策が提示される

### タスク 5.5: パッケージングと動作確認 (Day 5)
**所要時間**: 6時間

**実行可能パッケージ作成**:
```json
{
  "name": "electron-flow",
  "bin": {
    "electron-flow": "./bin/electron-flow"
  },
  "scripts": {
    "build:cli": "tsc -p cli/tsconfig.json",
    "prepublishOnly": "npm run build:cli"
  }
}
```

**手動動作確認**:
```bash
# 1. initコマンドの動作確認
mkdir sample-project
cd sample-project
npx electron-flow init

# 確認項目:
# - electron-flow.config.ts が作成されているか
# - src/types/context.ts が作成されているか
# - 適切なメッセージが表示されているか

# 2. genコマンドの動作確認
# サンプルAPIファイルを作成
mkdir -p src/main/api
echo 'export async function sampleFunc(ctx: any): Promise<string> { return "sample"; }' > src/main/api/sample.ts

npx electron-flow gen

# 確認項目:
# - プリロードファイルが生成されているか
# - ハンドラーファイルが生成されているか
# - 型定義ファイルが生成されているか
# - エラーが発生していないか

# 3. エラーケースの動作確認
npx electron-flow gen --config nonexistent.config.ts

# 確認項目:
# - 適切なエラーメッセージが表示されているか
# - エラーから回復できるか

# 4. 監視モードの動作確認
npx electron-flow gen --watch &
# ファイルを変更してみる
echo '// comment' >> src/main/api/sample.ts
# 自動ビルドが実行されるか確認
```

**完了基準**: CLIが正常にパッケージされ、手動動作確認で問題がない

## 3. 技術要件

### 3.1 使用ライブラリ
- **commander**: CLI フレームワーク
- **chalk**: コンソール出力の色付け
- **inquirer**: インタラクティブな質問（必要に応じて）
- **ora**: スピナー表示（必要に応じて）

### 3.2 ユーザビリティ要件
- **直感的なコマンド**: 覚えやすいコマンド名
- **分かりやすいエラーメッセージ**: 解決策を含む
- **適切なヘルプ**: --help で詳細な説明
- **進捗表示**: 長時間処理の可視化

## 4. 完了基準

### 4.1 必須基準
- [ ] initコマンドが動作し、設定ファイルを正しく生成
- [ ] genコマンドが動作し、コード生成が成功
- [ ] 監視モード（--watch）が正常動作
- [ ] エラーケースで分かりやすいメッセージを表示

### 4.2 推奨基準
- [ ] プログレスバーやスピナーの表示
- [ ] インタラクティブな設定生成
- [ ] カラフルで見やすい出力

## 5. 次フェーズへの引き継ぎ

### 5.1 Phase 6への準備
- 監視モードの最適化対象特定
- パフォーマンス測定のベースライン確立
- ファイル監視の詳細要件確認

### 5.2 成果物
- **完全に動作するCLI**: init、genコマンド
- **実行可能パッケージ**: npm install でグローバル利用可能
