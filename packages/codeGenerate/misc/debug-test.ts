/**
 * デバッグ用簡単テスト
 */

import * as path from 'path';
import { parseTypeScriptFiles } from '../src/parse.js';
import { analyzeZodSchemas } from '../src/zod.js';

async function debugTest() {
  console.log('=== デバッグテスト ===\n');

  const testFile = path.join(__dirname, 'test-sample.ts');
  
  try {
    console.log(`テストファイル: ${testFile}`);
    
    // 1ファイルのみを対象とした解析
    console.log('\n1. 単一ファイル解析テスト');
    const packages = await parseTypeScriptFiles(path.dirname(testFile), [], {
      excludePatterns: ['node_modules', 'dist', 'src', 'templates'],
      verbose: true
    });

    console.log(`パッケージ数: ${packages.length}`);
    
    if (packages.length > 0) {
      const pkg = packages.find(p => p.packageName === 'test-sample');
      if (pkg) {
        console.log('\ntest-sampleパッケージ:');
        console.log(`  関数数: ${pkg.functions.length}`);
        console.log(`  インポート数: ${pkg.imports.length}`);
        console.log(`  エクスポート数: ${pkg.exports.length}`);
        
        if (pkg.functions.length > 0) {
          console.log('\n  関数一覧:');
          pkg.functions.forEach(func => {
            console.log(`    - ${func.name} (async: ${func.isAsync}, exported: ${func.isExported})`);
          });
        }
        
        if (pkg.exports.length > 0) {
          console.log('\n  エクスポート一覧:');
          pkg.exports.forEach(exp => {
            console.log(`    - ${exp.name} (type: ${exp.type}, default: ${exp.isDefault})`);
          });
        }
      }
    }

    // Zodスキーマ解析
    console.log('\n\n2. Zodスキーマ解析テスト');
    const schemas = await analyzeZodSchemas(path.dirname(testFile));
    
    console.log(`Zodスキーマ数: ${schemas.length}`);
    
    if (schemas.length > 0) {
      schemas.forEach(schema => {
        console.log(`\n  スキーマ: ${schema.name}`);
        console.log(`    ファイル: ${path.basename(schema.filePath)}`);
        console.log(`    プロパティ数: ${schema.schema.properties ? Object.keys(schema.schema.properties).length : 0}`);
      });
    } else {
      console.log('  Zodスキーマが見つかりませんでした');
    }

  } catch (error) {
    console.error('デバッグテストエラー:', error);
  }
}

debugTest().catch(console.error);