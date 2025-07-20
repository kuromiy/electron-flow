/**
 * パブリックAPI動作確認テスト
 */

import * as path from 'path';
import { parseTypeScriptFiles } from '../src/parse.js';
import { analyzeZodSchemas } from '../src/zod.js';

async function testPublicAPI() {
  console.log('=== パブリックAPI動作確認テスト ===\n');

  const testFile = path.join(__dirname, 'test-sample.ts');
  const testDir = path.dirname(testFile);
  
  console.log(`テストファイル: ${testFile}`);
  console.log(`テストディレクトリ: ${testDir}`);

  try {
    // 1. 単一ファイルを対象としたTypeScript解析
    console.log('\n1. 単一ファイル解析テスト');
    console.log('parseTypeScriptFiles関数を直接呼び出し...');
    
    const packages = await parseTypeScriptFiles(testDir, [], {
      excludePatterns: ['node_modules', 'dist', 'src'], // srcフォルダを除外してtest-sample.tsのみを対象
      verbose: true
    });

    console.log(`\n📊 解析結果: ${packages.length}個のパッケージ`);
    
    packages.forEach(pkg => {
      console.log(`\nパッケージ: ${pkg.packageName}`);
      console.log(`  ファイル: ${path.basename(pkg.filePath)}`);
      console.log(`  関数数: ${pkg.functions.length}`);
      console.log(`  インポート数: ${pkg.imports.length}`);
      console.log(`  エクスポート数: ${pkg.exports.length}`);
    });

    // test-sample.tsに特化した詳細表示
    const testSamplePkg = packages.find(p => p.packageName === 'test-sample');
    if (testSamplePkg) {
      console.log('\n📋 test-sample.ts詳細:');
      console.log('関数一覧:');
      testSamplePkg.functions.forEach(func => {
        console.log(`  ✓ ${func.name} (async: ${func.isAsync}, exported: ${func.isExported})`);
        console.log(`    戻り値: ${func.returnType.text}`);
        console.log(`    パラメータ: ${func.parameters.map(p => `${p.name}: ${p.type.text}`).join(', ')}`);
      });
    } else {
      console.log('❌ test-sample.tsパッケージが見つかりません');
    }

    // 2. Zodスキーマ解析
    console.log('\n\n2. Zodスキーマ解析テスト');
    console.log('analyzeZodSchemas関数を直接呼び出し...');
    
    const zodSchemas = await analyzeZodSchemas(testDir);
    
    console.log(`\n📊 解析結果: ${zodSchemas.length}個のZodスキーマ`);
    
    zodSchemas.forEach(schema => {
      console.log(`\nスキーマ: ${schema.name}`);
      console.log(`  ファイル: ${path.basename(schema.filePath)}`);
      console.log(`  エクスポートタイプ: ${schema.exportType}`);
      
      if (schema.schema.properties) {
        const propertyCount = Object.keys(schema.schema.properties).length;
        console.log(`  プロパティ数: ${propertyCount}`);
        
        Object.entries(schema.schema.properties).forEach(([fieldName, fieldInfo]) => {
          console.log(`    ✓ ${fieldName}: ${fieldInfo.type}${fieldInfo.optional ? '?' : ''}`);
        });
      }
    });

    // 3. 統計
    console.log('\n\n3. 統計情報');
    const totalFunctions = packages.reduce((sum, pkg) => sum + pkg.functions.length, 0);
    const totalZodSchemas = zodSchemas.length;
    
    console.log(`総関数数: ${totalFunctions}`);
    console.log(`総Zodスキーマ数: ${totalZodSchemas}`);
    
    if (totalFunctions === 0) {
      console.log('❌ 関数が検出されていません - 問題があります');
    } else {
      console.log('✅ 関数検出成功');
    }
    
    if (totalZodSchemas === 0) {
      console.log('❌ Zodスキーマが検出されていません - 問題があります');
    } else {
      console.log('✅ Zodスキーマ検出成功');
    }

  } catch (error) {
    console.error('パブリックAPIテストエラー:', error);
    console.error('スタックトレース:', error.stack);
  }
}

testPublicAPI().catch(console.error);