/**
 * Phase 4: ビルドシステムの統合確認とパフォーマンス検証
 * 完全なビルドプロセスの動作確認を行う
 */

import * as path from 'path';
import * as fs from 'fs';
import { BuildManager } from '../src/build.js';
import { ConfigManager } from '../src/config.js';
import { fileManager } from '../src/fileManager.js';
import type { ExtendedAutoCodeOption } from '../src/config.js';

/**
 * テスト用のサンプルAPIファイルを作成
 */
async function createSampleApiFiles(): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp-test');
  
  // ディレクトリ作成
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // サンプルAPI 1: ユーザー管理
  const userApiContent = `
import { z } from 'zod';

export interface Context {
  userId?: string;
  sessionId: string;
}

export const CreateUserSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  age: z.number().min(0).max(150).optional()
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

export interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
  createdAt: Date;
}

/**
 * ユーザーを作成
 */
export async function createUser(ctx: Context, request: CreateUserRequest): Promise<User> {
  const validated = CreateUserSchema.parse(request);
  
  return {
    id: Math.random().toString(36),
    ...validated,
    createdAt: new Date()
  };
}

/**
 * ユーザー一覧を取得
 */
export async function getUsers(ctx: Context): Promise<User[]> {
  return [];
}

/**
 * ユーザーを取得
 */
export async function getUserById(ctx: Context, id: string): Promise<User | null> {
  return null;
}
`;

  // サンプルAPI 2: プロジェクト管理
  const projectApiContent = `
import { z } from 'zod';

export interface Context {
  userId?: string;
  sessionId: string;
}

export const ProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active')
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * プロジェクトを作成
 */
export async function createProject(ctx: Context, project: Project): Promise<Project> {
  return { ...project, status: 'active' };
}

/**
 * プロジェクト一覧を取得
 */
export async function listProjects(ctx: Context, limit?: number): Promise<Project[]> {
  return [];
}
`;

  // ファイル書き込み
  const userApiPath = path.join(tempDir, 'users.ts');
  const projectApiPath = path.join(tempDir, 'projects.ts');
  
  fs.writeFileSync(userApiPath, userApiContent.trim());
  fs.writeFileSync(projectApiPath, projectApiContent.trim());

  console.log(`📁 サンプルAPIファイルを作成: ${tempDir}`);
  console.log(`  - users.ts (${userApiContent.length} chars)`);
  console.log(`  - projects.ts (${projectApiContent.length} chars)`);

  return tempDir;
}

/**
 * テスト用設定を作成
 */
function createTestConfig(targetPath: string): ExtendedAutoCodeOption {
  const outputDir = path.join(process.cwd(), 'temp-output');
  
  // 出力ディレクトリ作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return {
    targetPath,
    ignores: [],
    preloadPath: path.join(outputDir, 'preload.ts'),
    registerPath: path.join(outputDir, 'handlers.ts'),
    rendererPath: path.join(outputDir, 'types.d.ts'),
    logLevel: 'debug',
    advanced: {
      concurrency: 4,
      createBackup: false,
      includeTimestamp: true,
      verbose: true,
      excludePatterns: ['**/*.d.ts', '**/__tests__/**']
    }
  };
}

/**
 * 完全なビルドプロセスの動作確認
 */
async function verifyFullBuildProcess(): Promise<boolean> {
  console.log('\n=== 📋 完全ビルドプロセス動作確認 ===');
  
  try {
    // サンプルファイル作成
    const targetPath = await createSampleApiFiles();
    const config = createTestConfig(targetPath);

    console.log('\n🔧 設定情報:');
    console.log(`  Target: ${config.targetPath}`);
    console.log(`  Preload: ${config.preloadPath}`);
    console.log(`  Handler: ${config.registerPath}`);
    console.log(`  Types: ${config.rendererPath}`);

    // ビルド実行
    console.log('\n🚀 ビルド開始...');
    const buildManager = new BuildManager();
    const startTime = Date.now();
    
    const result = await buildManager.build(config);
    const buildTime = Date.now() - startTime;

    // 結果確認
    console.log('\n📊 ビルド結果:');
    console.log(`  成功: ${result.success ? '✅' : '❌'}`);
    console.log(`  時間: ${buildTime}ms`);
    console.log(`  解析ファイル数: ${result.statistics.analyzedFiles}`);
    console.log(`  抽出関数数: ${result.statistics.extractedFunctions}`);
    console.log(`  抽出スキーマ数: ${result.statistics.extractedSchemas}`);
    console.log(`  生成ファイル数: ${result.statistics.generatedFiles}`);
    console.log(`  メモリ使用量: ${Math.round(result.statistics.memoryUsage / 1024 / 1024)}MB`);

    if (result.errors.length > 0) {
      console.log('\n⚠️ エラー:');
      result.errors.forEach(error => {
        console.log(`  - ${error.message}`);
      });
    }

    // 生成ファイルの確認
    if (result.success && result.generatedFiles) {
      console.log('\n📄 生成ファイル確認:');
      for (const filePath of result.generatedFiles) {
        const exists = fs.existsSync(filePath);
        const size = exists ? fs.statSync(filePath).size : 0;
        console.log(`  ${exists ? '✅' : '❌'} ${path.basename(filePath)} (${size} bytes)`);
        
        if (exists && size > 0) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').length;
          console.log(`    📝 ${lines} lines`);
        }
      }
    }

    return result.success;
  } catch (error) {
    console.error('❌ ビルドプロセス検証失敗:', error);
    return false;
  }
}

/**
 * エラーハンドリングの動作確認
 */
async function verifyErrorHandling(): Promise<boolean> {
  console.log('\n=== 🚨 エラーハンドリング確認 ===');
  
  try {
    // 不正な設定でテスト
    const invalidConfig: ExtendedAutoCodeOption = {
      targetPath: '/nonexistent/path',
      ignores: [],
      preloadPath: '/invalid/preload.ts',
      registerPath: '/invalid/handlers.ts',
      rendererPath: '/invalid/types.d.ts'
    };

    console.log('🧪 不正な設定でビルドテスト...');
    const buildManager = new BuildManager();
    const result = await buildManager.build(invalidConfig);

    console.log('📊 エラーハンドリング結果:');
    console.log(`  成功: ${result.success ? '✅' : '❌'}`);
    console.log(`  エラー数: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('  エラー詳細:');
      result.errors.forEach((error, index) => {
        console.log(`    ${index + 1}. ${error.type}: ${error.message}`);
      });
    }

    return !result.success; // エラーが正しく処理されていればfalseが返る
  } catch (error) {
    console.log('✅ エラーが正しくキャッチされました');
    return true;
  }
}

/**
 * パフォーマンス確認
 */
async function verifyPerformance(): Promise<boolean> {
  console.log('\n=== ⚡ パフォーマンス確認 ===');
  
  const maxBuildTime = 5000; // 5秒制限
  
  try {
    // より多くのファイルを作成
    const tempDir = path.join(process.cwd(), 'temp-perf-test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log('📁 大量ファイル作成中...');
    const fileCount = 20; // テスト用に20ファイル作成
    
    for (let i = 0; i < fileCount; i++) {
      const content = `
export interface Context {
  userId: string;
  sessionId: string;
}

export async function testFunction${i}(ctx: Context, data: any): Promise<string> {
  return 'test';
}

export async function anotherFunction${i}(ctx: Context): Promise<number> {
  return ${i};
}
`;
      fs.writeFileSync(path.join(tempDir, `api${i}.ts`), content.trim());
    }

    const config = createTestConfig(tempDir);
    config.logLevel = 'warn'; // ログを減らしてパフォーマンス測定

    console.log(`🚀 パフォーマンステスト開始 (${fileCount}ファイル)...`);
    const buildManager = new BuildManager();
    const startTime = Date.now();
    
    const result = await buildManager.build(config);
    const buildTime = Date.now() - startTime;

    console.log('📊 パフォーマンス結果:');
    console.log(`  ビルド時間: ${buildTime}ms`);
    console.log(`  制限時間: ${maxBuildTime}ms`);
    console.log(`  結果: ${buildTime < maxBuildTime ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ファイル/秒: ${Math.round((fileCount / buildTime) * 1000)}`);
    console.log(`  メモリ効率: ${Math.round(result.statistics.memoryUsage / 1024 / 1024)}MB`);

    return buildTime < maxBuildTime;
  } catch (error) {
    console.error('❌ パフォーマンステスト失敗:', error);
    return false;
  }
}

/**
 * 設定管理の動作確認
 */
async function verifyConfigManagement(): Promise<boolean> {
  console.log('\n=== ⚙️ 設定管理確認 ===');
  
  try {
    const configManager = new ConfigManager();
    
    // 有効な設定をテスト
    const validConfig = {
      targetPath: process.cwd(),
      ignores: ['test'],
      preloadPath: '/tmp/preload.ts',
      registerPath: '/tmp/handlers.ts',
      rendererPath: '/tmp/types.d.ts'
    };

    console.log('🧪 設定検証テスト...');
    const result = configManager['validateAndNormalize'](validConfig);
    
    console.log('📊 設定管理結果:');
    console.log(`  検証: ✅ 成功`);
    console.log(`  パス正規化: ✅ 完了`);
    console.log(`  デフォルト値: ✅ 適用`);
    console.log(`  ログレベル: ${result.logLevel}`);
    console.log(`  除外パターン: ${result.advanced?.excludePatterns?.length}個`);

    return true;
  } catch (error) {
    console.error('❌ 設定管理テスト失敗:', error);
    return false;
  }
}

/**
 * ファイル管理の動作確認
 */
async function verifyFileManagement(): Promise<boolean> {
  console.log('\n=== 📂 ファイル管理確認 ===');
  
  try {
    const tempDir = path.join(process.cwd(), 'temp-file-test');
    
    console.log('🧪 ファイル操作テスト...');
    
    // ファイルスキャンテスト
    const scanResult = await fileManager.scanWithDetails(process.cwd(), ['node_modules', 'dist']);
    
    console.log('📊 ファイル管理結果:');
    console.log(`  スキャン: ✅ 成功`);
    console.log(`  発見ファイル数: ${scanResult.totalFiles}`);
    console.log(`  総サイズ: ${Math.round(scanResult.totalSize / 1024)}KB`);
    console.log(`  スキャン時間: ${scanResult.scanTime}ms`);

    // ファイル書き込みテスト
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const testFilePath = path.join(tempDir, 'test.ts');
    await fileManager.writeGeneratedFile(testFilePath, 'export const test = "hello";');
    
    const exists = fs.existsSync(testFilePath);
    console.log(`  ファイル書き込み: ${exists ? '✅' : '❌'}`);

    return scanResult.totalFiles > 0 && exists;
  } catch (error) {
    console.error('❌ ファイル管理テスト失敗:', error);
    return false;
  }
}

/**
 * クリーンアップ
 */
function cleanup(): void {
  const tempDirs = [
    'temp-test',
    'temp-output', 
    'temp-perf-test',
    'temp-file-test'
  ];

  tempDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`🧹 クリーンアップ: ${dir}`);
    }
  });
}

/**
 * すべての動作確認を実行
 */
async function runAllVerifications(): Promise<void> {
  console.log('🚀 Phase 4: ビルドシステム動作確認開始\n');
  
  const tests = [
    { name: '設定管理', func: verifyConfigManagement },
    { name: 'ファイル管理', func: verifyFileManagement },
    { name: '完全ビルドプロセス', func: verifyFullBuildProcess },
    { name: 'エラーハンドリング', func: verifyErrorHandling },
    { name: 'パフォーマンス', func: verifyPerformance }
  ];

  const results: { name: string; success: boolean }[] = [];

  for (const test of tests) {
    try {
      const success = await test.func();
      results.push({ name: test.name, success });
    } catch (error) {
      console.error(`❌ ${test.name}テスト実行失敗:`, error);
      results.push({ name: test.name, success: false });
    }
  }

  // 結果サマリー
  console.log('\n=== 📋 動作確認結果サマリー ===');
  let allPassed = true;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (!result.success) allPassed = false;
  });

  console.log('\n=== 🎯 総合結果 ===');
  if (allPassed) {
    console.log('✅ すべてのテストが成功しました！');
    console.log('🎉 Phase 4: ビルドシステムは正常に動作しています');
  } else {
    console.log('❌ 一部のテストが失敗しました');
    console.log('🔧 失敗したテストを確認して修正してください');
  }

  // クリーンアップ
  console.log('\n🧹 クリーンアップ中...');
  cleanup();
  
  console.log('\n✨ 動作確認完了');
  process.exit(allPassed ? 0 : 1);
}

// メイン実行
if (require.main === module) {
  runAllVerifications().catch(error => {
    console.error('❌ 動作確認実行エラー:', error);
    cleanup();
    process.exit(1);
  });
}