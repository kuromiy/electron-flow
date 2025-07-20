/**
 * 簡単なテストスクリプト - 問題の特定用
 */

import * as ts from 'typescript';
import * as path from 'path';
import { ASTParser } from '../src/parse.js';
import { ZodSchemaAnalyzer } from '../src/zod.js';

function simpleTest() {
  console.log('=== 簡単なテスト - 問題特定用 ===\n');

  const testFile = path.join(__dirname, 'test-sample.ts');
  console.log(`テストファイル: ${testFile}`);

  try {
    // 1. 直接TypeScriptプログラムを作成
    console.log('\n1. TypeScriptプログラム作成テスト');
    const program = ts.createProgram([testFile], {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      strict: true,
    });

    const sourceFile = program.getSourceFile(testFile);
    if (!sourceFile) {
      console.error('ソースファイルが取得できません');
      return;
    }
    console.log('✅ ソースファイル取得成功');

    // 2. パーサーインスタンス作成テスト
    console.log('\n2. パーサーインスタンス作成テスト');
    const astParser = new ASTParser();
    const zodAnalyzer = new ZodSchemaAnalyzer();
    console.log('✅ パーサーインスタンス作成成功');

    // 3. 基本的なAST探索
    console.log('\n3. 基本AST探索テスト');
    let functionCount = 0;
    let variableCount = 0;

    function visit(node: ts.Node): void {
      if (ts.isFunctionDeclaration(node)) {
        functionCount++;
        const name = node.name ? (node.name.text || node.name.escapedText) : 'anonymous';
        console.log(`  関数発見: ${name}`);
      }
      if (ts.isVariableStatement(node)) {
        variableCount++;
        node.declarationList.declarations.forEach(declaration => {
          if (ts.isIdentifier(declaration.name)) {
            const varName = declaration.name.text || declaration.name.escapedText;
            console.log(`  変数発見: ${varName}`);
          }
        });
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    console.log(`\n関数数: ${functionCount}, 変数数: ${variableCount}`);

    // 4. パブリックメソッドのテスト
    console.log('\n4. エラー取得テスト');
    const astErrors = astParser.getErrors();
    const zodErrors = zodAnalyzer.getErrors();
    console.log(`AST解析エラー数: ${astErrors.length}`);
    console.log(`Zod解析エラー数: ${zodErrors.length}`);

    if (astErrors.length > 0) {
      console.log('AST解析エラー:');
      astErrors.forEach(error => console.log(`  - ${error.message}`));
    }

    if (zodErrors.length > 0) {
      console.log('Zod解析エラー:');
      zodErrors.forEach(error => console.log(`  - ${error.message}`));
    }

  } catch (error) {
    console.error('テスト実行エラー:', error);
  }
}

simpleTest();