/**
 * TypeScript Compiler API調査用プロトタイプ
 * Phase 2での実装前の調査とテスト用
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TypeScript AST構造を探索するプロトタイプ関数
 * @param filePath - 解析対象のTypeScriptファイルパス
 */
export function exploreAST(filePath: string): void {
  console.log(`=== AST探索開始: ${filePath} ===`);

  // TypeScriptプログラムの作成
  const program = ts.createProgram([filePath], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    console.error(`ファイルが見つかりません: ${filePath}`);
    return;
  }

  console.log(`ソースファイル: ${sourceFile.fileName}`);
  console.log(`言語バージョン: ${sourceFile.languageVersion}`);
  console.log(`---`);

  // AST ノードを再帰的に探索
  function visit(node: ts.Node, depth: number = 0): void {
    const indent = '  '.repeat(depth);
    const kindName = ts.SyntaxKind[node.kind];
    const nodeText = node.getText().slice(0, 50).replace(/\n/g, '\\n');
    
    console.log(`${indent}${kindName}: "${nodeText}"`);

    // 特定のノードタイプに対する詳細情報
    if (ts.isFunctionDeclaration(node)) {
      console.log(`${indent}  -> 関数名: ${node.name?.getText() || 'anonymous'}`);
      console.log(`${indent}  -> パラメータ数: ${node.parameters.length}`);
      console.log(`${indent}  -> 非同期: ${node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false}`);
      console.log(`${indent}  -> エクスポート: ${node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false}`);
    }

    if (ts.isVariableStatement(node)) {
      console.log(`${indent}  -> 変数宣言: ${node.declarationList.declarations.length}個`);
    }

    if (ts.isCallExpression(node)) {
      const expression = node.expression.getText();
      if (expression.includes('z.object') || expression.includes('zod')) {
        console.log(`${indent}  -> Zod関連の呼び出し検出: ${expression}`);
      }
    }

    // 子ノードを再帰的に探索
    ts.forEachChild(node, child => visit(child, depth + 1));
  }

  visit(sourceFile);
  console.log(`=== AST探索完了 ===\n`);
}

/**
 * 関数宣言の詳細情報を抽出するプロトタイプ
 * @param filePath - 解析対象のファイルパス
 */
export function extractFunctionInfo(filePath: string): void {
  console.log(`=== 関数情報抽出: ${filePath} ===`);

  const program = ts.createProgram([filePath], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  });

  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    console.error(`ファイルが見つかりません: ${filePath}`);
    return;
  }

  const functions: any[] = [];

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node)) {
      const functionInfo = {
        name: node.name?.getText() || 'anonymous',
        parameters: node.parameters.map(param => ({
          name: param.name.getText(),
          type: param.type?.getText() || 'any',
          optional: !!param.questionToken,
          defaultValue: param.initializer?.getText(),
        })),
        returnType: node.type?.getText() || 'void',
        isAsync: node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
        isExported: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false,
      };
      
      functions.push(functionInfo);
      console.log('関数発見:', JSON.stringify(functionInfo, null, 2));
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  
  console.log(`\n合計 ${functions.length} 個の関数を発見`);
  console.log(`=== 関数情報抽出完了 ===\n`);
}

/**
 * Zodスキーマ検出のプロトタイプ
 * @param filePath - 解析対象のファイルパス
 */
export function detectZodSchemas(filePath: string): void {
  console.log(`=== Zodスキーマ検出: ${filePath} ===`);

  const program = ts.createProgram([filePath], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  });

  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    console.error(`ファイルが見つかりません: ${filePath}`);
    return;
  }

  const zodSchemas: any[] = [];

  function visit(node: ts.Node): void {
    // z.object() の検出
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.expression) &&
          expression.expression.getText() === 'z' &&
          expression.name.getText() === 'object') {
        
        console.log('Zodオブジェクト検出:', node.getText().slice(0, 100));
        
        // 引数の解析（オブジェクトリテラル）
        if (node.arguments.length > 0 && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
          const objectLiteral = node.arguments[0];
          console.log('  フィールド数:', objectLiteral.properties.length);
          
          objectLiteral.properties.forEach(prop => {
            if (ts.isPropertyAssignment(prop) && prop.name && prop.initializer) {
              const fieldName = prop.name.getText();
              const fieldValue = prop.initializer.getText();
              console.log(`    ${fieldName}: ${fieldValue}`);
            }
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  console.log(`=== Zodスキーマ検出完了 ===\n`);
}

/**
 * サンプルAPIファイルを作成してテスト用に使用
 */
export function createSampleFile(): string {
  const sampleContent = `
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().optional(),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;

export async function createUser(ctx: Context, request: CreateUserRequest) {
  return { id: 1, ...request };
}

export function getUsers(ctx: Context) {
  return [];
}

interface Context {
  event: any;
}
`;

  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const filePath = path.join(tempDir, 'sample-api.ts');
  fs.writeFileSync(filePath, sampleContent.trim());
  
  return filePath;
}

/**
 * プロトタイプの実行とテスト
 */
export function runPrototype(): void {
  console.log('TypeScript Compiler API調査プロトタイプ実行中...\n');

  // サンプルファイルを作成
  const sampleFile = createSampleFile();
  console.log(`サンプルファイル作成: ${sampleFile}\n`);

  // 各プロトタイプ関数を実行
  exploreAST(sampleFile);
  extractFunctionInfo(sampleFile);
  detectZodSchemas(sampleFile);

  console.log('プロトタイプ実行完了');
}