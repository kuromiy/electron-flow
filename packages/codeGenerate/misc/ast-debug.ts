/**
 * AST解析デバッグ用スクリプト
 */

import * as ts from 'typescript';
import * as path from 'path';

function debugAST() {
  console.log('=== AST解析デバッグ ===\n');

  const testFile = path.join(__dirname, 'test-sample.ts');
  console.log(`解析対象ファイル: ${testFile}`);

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

    console.log(`ソースファイル名: ${sourceFile.fileName}`);
    console.log(`言語バージョン: ${sourceFile.languageVersion}`);
    console.log('---');

    let functionCount = 0;
    let variableCount = 0;
    let zodCount = 0;

    // AST探索
    function visit(node: ts.Node, depth: number = 0): void {
      const indent = '  '.repeat(depth);
      const kindName = ts.SyntaxKind[node.kind];
      
      // 詳細な情報を表示
      if (ts.isFunctionDeclaration(node)) {
        functionCount++;
        try {
          const name = node.name ? node.name.text || node.name.escapedText : 'anonymous';
          const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
          const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
          
          console.log(`${indent}🔹 ${kindName}: ${name}`);
          console.log(`${indent}   エクスポート: ${isExported}, 非同期: ${isAsync}`);
          console.log(`${indent}   パラメータ数: ${node.parameters.length}`);
        } catch (error) {
          console.log(`${indent}🔹 ${kindName}: [関数解析エラー]`);
        }
      }
      
      if (ts.isVariableStatement(node)) {
        variableCount++;
        const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
        
        console.log(`${indent}🔸 ${kindName} (エクスポート: ${isExported})`);
        
        node.declarationList.declarations.forEach(declaration => {
          try {
            if (declaration.name && ts.isIdentifier(declaration.name)) {
              const varName = declaration.name.text || declaration.name.escapedText;
              console.log(`${indent}   変数: ${varName}`);
              
              // z.object() の検出
              if (declaration.initializer && ts.isCallExpression(declaration.initializer)) {
                const expr = declaration.initializer.expression;
                if (ts.isPropertyAccessExpression(expr) &&
                    ts.isIdentifier(expr.expression) &&
                    (expr.expression.text === 'z' || expr.expression.escapedText === 'z') &&
                    (expr.name.text === 'object' || expr.name.escapedText === 'object')) {
                  zodCount++;
                  console.log(`${indent}   🎯 Zodスキーマ検出: ${varName}`);
                }
              }
            } else {
              console.log(`${indent}   変数: [複雑な名前パターン]`);
            }
          } catch (error) {
            console.log(`${indent}   変数解析エラー: ${error}`);
          }
        });
      }

      // その他の重要なノード
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          console.log(`${indent}📥 インポート: ${moduleSpecifier.text}`);
        }
      }

      if (ts.isExportDeclaration(node)) {
        console.log(`${indent}📤 エクスポート宣言`);
      }

      // 子ノードを再帰的に探索
      ts.forEachChild(node, child => visit(child, depth + 1));
    }

    console.log('AST探索開始...\n');
    visit(sourceFile);

    console.log('\n=== 解析結果サマリー ===');
    console.log(`関数宣言: ${functionCount}個`);
    console.log(`変数宣言: ${variableCount}個`);
    console.log(`Zodスキーマ: ${zodCount}個`);

  } catch (error) {
    console.error('AST解析エラー:', error);
  }
}

debugAST();