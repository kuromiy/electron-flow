/**
 * 直接メソッド呼び出しテスト - 問題の特定
 */

import * as ts from 'typescript';
import * as path from 'path';
import { ASTParser } from '../src/parse.js';
import { ZodSchemaAnalyzer } from '../src/zod.js';

async function directTest() {
  console.log('=== 直接メソッド呼び出しテスト ===\n');

  const testFile = path.join(__dirname, 'test-sample.ts');
  console.log(`テストファイル: ${testFile}`);

  try {
    // 1. パーサーインスタンス作成
    console.log('\n1. パーサーインスタンス作成');
    const astParser = new ASTParser();
    const zodAnalyzer = new ZodSchemaAnalyzer();
    console.log('✅ インスタンス作成成功');

    // 2. プログラム作成
    console.log('\n2. プログラム作成テスト');
    const program = astParser.createProgram([testFile]);
    console.log('✅ プログラム作成成功');

    // 3. ソースファイル取得
    console.log('\n3. ソースファイル取得テスト');
    const sourceFile = program.getSourceFile(testFile);
    if (!sourceFile) {
      console.error('❌ ソースファイルが取得できません');
      return;
    }
    console.log('✅ ソースファイル取得成功');
    console.log(`  ファイル名: ${sourceFile.fileName}`);
    console.log(`  言語バージョン: ${sourceFile.languageVersion}`);

    // 4. 関数解析テスト
    console.log('\n4. 関数解析テスト');
    try {
      const functions = astParser.parseSourceFile(sourceFile, testFile);
      console.log(`✅ 関数解析完了: ${functions.length}個の関数`);
      
      if (functions.length > 0) {
        console.log('関数一覧:');
        functions.forEach(func => {
          console.log(`  - ${func.name} (async: ${func.isAsync}, exported: ${func.isExported})`);
        });
      } else {
        console.log('❌ 関数が検出されませんでした');
        
        // エラー情報確認
        const errors = astParser.getErrors();
        if (errors.length > 0) {
          console.log('解析エラー:');
          errors.forEach(error => {
            console.log(`  - ${error.type}: ${error.message}`);
          });
        }
      }
    } catch (error) {
      console.error('❌ 関数解析エラー:', error);
    }

    // 5. インポート解析テスト
    console.log('\n5. インポート解析テスト');
    try {
      const imports = astParser.parseImports(sourceFile);
      console.log(`✅ インポート解析完了: ${imports.length}個のインポート`);
      
      if (imports.length > 0) {
        imports.forEach(imp => {
          console.log(`  - ${imp.moduleName}: [${imp.importedNames.join(', ')}]`);
        });
      }
    } catch (error) {
      console.error('❌ インポート解析エラー:', error);
    }

    // 6. エクスポート解析テスト
    console.log('\n6. エクスポート解析テスト');
    try {
      const exports = astParser.parseExports(sourceFile);
      console.log(`✅ エクスポート解析完了: ${exports.length}個のエクスポート`);
      
      if (exports.length > 0) {
        exports.forEach(exp => {
          console.log(`  - ${exp.name} (type: ${exp.type}, default: ${exp.isDefault})`);
        });
      }
    } catch (error) {
      console.error('❌ エクスポート解析エラー:', error);
    }

    // 7. Zodスキーマ解析テスト
    console.log('\n7. Zodスキーマ解析テスト');
    try {
      const zodProgram = zodAnalyzer.createProgram([testFile]);
      const zodSourceFile = zodProgram.getSourceFile(testFile);
      
      if (zodSourceFile) {
        const schemas = zodAnalyzer.detectZodSchemas(zodSourceFile, testFile);
        console.log(`✅ Zodスキーマ解析完了: ${schemas.length}個のスキーマ`);
        
        if (schemas.length > 0) {
          schemas.forEach(schema => {
            console.log(`  - ${schema.name}: ${schema.exportType}`);
            if (schema.schema.properties) {
              const propCount = Object.keys(schema.schema.properties).length;
              console.log(`    プロパティ数: ${propCount}`);
            }
          });
        } else {
          console.log('❌ Zodスキーマが検出されませんでした');
          
          // エラー情報確認
          const zodErrors = zodAnalyzer.getErrors();
          if (zodErrors.length > 0) {
            console.log('Zod解析エラー:');
            zodErrors.forEach(error => {
              console.log(`  - ${error.type}: ${error.message}`);
            });
          }
        }
      } else {
        console.error('❌ Zodのソースファイルが取得できません');
      }
    } catch (error) {
      console.error('❌ Zodスキーマ解析エラー:', error);
    }

  } catch (error) {
    console.error('直接テスト実行エラー:', error);
    console.error('スタックトレース:', error.stack);
  }
}

directTest().catch(console.error);