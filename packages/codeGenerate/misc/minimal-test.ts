/**
 * 最小限のテスト - node.text問題の特定
 */

import * as ts from 'typescript';
import * as path from 'path';

function minimalTest() {
  console.log('=== 最小限のテスト - node.text問題特定 ===\n');

  const testFile = path.join(__dirname, 'test-sample.ts');
  console.log(`テストファイル: ${testFile}`);

  try {
    // TypeScriptプログラムを作成
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

    console.log('✅ ソースファイル取得成功\n');

    // 関数宣言の詳細な解析
    let functionCount = 0;

    function visit(node: ts.Node): void {
      if (ts.isFunctionDeclaration(node)) {
        functionCount++;
        console.log(`🔹 関数宣言発見: ${functionCount}`);
        
        try {
          // 関数名の取得テスト
          console.log(`  関数名ノード: ${node.name ? 'あり' : 'なし'}`);
          if (node.name) {
            console.log(`  関数名.text: ${node.name.text || 'undefined'}`);
            console.log(`  関数名.escapedText: ${node.name.escapedText || 'undefined'}`);
            const name = node.name.text || node.name.escapedText;
            console.log(`  ✅ 関数名: ${name}`);
          }

          // パラメータの詳細解析
          console.log(`  パラメータ数: ${node.parameters.length}`);
          node.parameters.forEach((param, index) => {
            console.log(`    パラメータ ${index}:`);
            console.log(`      名前ノード: ${param.name ? ts.SyntaxKind[param.name.kind] : 'なし'}`);
            
            if (param.name && ts.isIdentifier(param.name)) {
              console.log(`      名前.text: ${param.name.text || 'undefined'}`);
              console.log(`      名前.escapedText: ${param.name.escapedText || 'undefined'}`);
              const paramName = param.name.text || param.name.escapedText || `param${index}`;
              console.log(`      ✅ パラメータ名: ${paramName}`);
            } else {
              console.log(`      ❌ 複雑な名前パターン: ${ts.SyntaxKind[param.name?.kind || 0]}`);
            }

            // 型情報の確認
            if (param.type) {
              console.log(`      型ノード: ${ts.SyntaxKind[param.type.kind]}`);
              try {
                const typeText = param.type.getFullText ? param.type.getFullText().trim() : 'getFullText不可';
                console.log(`      ✅ 型テキスト: ${typeText}`);
              } catch (error) {
                console.log(`      ❌ 型テキスト取得エラー: ${error}`);
              }
            } else {
              console.log(`      型: なし`);
            }
          });

          // 戻り値型の確認
          if (node.type) {
            console.log(`  戻り値型ノード: ${ts.SyntaxKind[node.type.kind]}`);
            try {
              const returnTypeText = node.type.getFullText ? node.type.getFullText().trim() : 'getFullText不可';
              console.log(`  ✅ 戻り値型: ${returnTypeText}`);
            } catch (error) {
              console.log(`  ❌ 戻り値型取得エラー: ${error}`);
            }
          } else {
            console.log(`  戻り値型: なし`);
          }

        } catch (error) {
          console.log(`  ❌ 関数解析エラー: ${error}`);
        }
        
        console.log(''); // 空行
      }
      
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    console.log(`\n総関数数: ${functionCount}`);

  } catch (error) {
    console.error('最小限テスト実行エラー:', error);
  }
}

minimalTest();