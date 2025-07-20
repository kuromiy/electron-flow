/**
 * Zodスキーマ解析エンジン
 * Phase 2で実装: Zodスキーマ情報を解析してメタデータを抽出
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import type { 
  ZodObjectInfo, 
  ZodSchemaStructure, 
  ZodFieldInfo, 
  ValidationRule,
  ZodAnalysisOptions,
  AnalysisError
} from './types.js';

/**
 * Zodスキーマアナライザークラス
 * TypeScript Compiler APIを使用してZodスキーマを解析する
 */
export class ZodSchemaAnalyzer {
  private errors: AnalysisError[] = [];

  /**
   * 識別子から安全に名前を取得
   * @param identifier - 識別子ノード
   * @returns 名前の文字列
   */
  private getIdentifierName(identifier: ts.Identifier): string {
    return identifier.text || String(identifier.escapedText || 'unknown');
  }

  /**
   * TypeScriptプログラムを作成
   * @param filePaths - 解析対象ファイルのパス配列
   * @param compilerOptions - TypeScriptコンパイラーオプション
   */
  public createProgram(filePaths: string[], compilerOptions?: ts.CompilerOptions): ts.Program {
    const defaultOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      ...compilerOptions
    };

    return ts.createProgram(filePaths, defaultOptions);
  }

  /**
   * ソースファイルからZodスキーマを検出
   * @param sourceFile - TypeScriptソースファイル
   * @param filePath - ファイルパス
   * @returns Zodオブジェクト情報の配列
   */
  public detectZodSchemas(sourceFile: ts.SourceFile, filePath: string): ZodObjectInfo[] {
    const schemas: ZodObjectInfo[] = [];

    const visit = (node: ts.Node): void => {
      try {
        // const schema = z.object({ ... }) の形式を検出
        if (ts.isVariableStatement(node)) {
          const zodSchemas = this.extractZodSchemasFromVariableStatement(node, filePath, sourceFile);
          schemas.push(...zodSchemas);
        }
        
        ts.forEachChild(node, visit);
      } catch (error) {
        this.addError('parse_error', `Zodスキーマ検出エラー: ${error}`, filePath);
      }
    };

    visit(sourceFile);
    return schemas;
  }

  /**
   * 変数宣言からZodスキーマを抽出
   * @param node - 変数宣言ステートメント
   * @param filePath - ファイルパス
   * @param sourceFile - ソースファイル
   * @returns Zodオブジェクト情報の配列
   */
  private extractZodSchemasFromVariableStatement(node: ts.VariableStatement, filePath: string, sourceFile: ts.SourceFile): ZodObjectInfo[] {
    const schemas: ZodObjectInfo[] = [];

    node.declarationList.declarations.forEach(declaration => {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        const name = this.getIdentifierName(declaration.name);
        
        if (this.isZodObjectCall(declaration.initializer) && ts.isCallExpression(declaration.initializer)) {
          try {
            const schema = this.extractZodSchema(declaration.initializer, name, filePath, sourceFile);
            if (schema) {
              // エクスポート情報を追加
              const isExported = this.hasExportModifier(node);
              schema.exportType = isExported ? 'export const' : 'const';
              
              schemas.push(schema);
            }
          } catch (error) {
            this.addError('parse_error', `Zodスキーマ抽出エラー (${name}): ${error}`, filePath);
          }
        }
      }
    });

    return schemas;
  }

  /**
   * z.object() の呼び出しかどうかを判定
   * @param node - 式ノード
   * @returns z.object() の呼び出しかどうか
   */
  private isZodObjectCall(node: ts.Expression): boolean {
    if (!ts.isCallExpression(node)) {
      return false;
    }

    const expression = node.expression;
    if (!ts.isPropertyAccessExpression(expression)) {
      return false;
    }

    // z.object パターンの検出
    if (ts.isIdentifier(expression.expression) &&
        this.getIdentifierName(expression.expression) === 'z' &&
        ts.isIdentifier(expression.name) &&
        this.getIdentifierName(expression.name) === 'object') {
      return true;
    }

    return false;
  }

  /**
   * Zodスキーマ情報を抽出
   * @param node - 呼び出し式ノード (z.object(...))
   * @param name - スキーマ名
   * @param filePath - ファイルパス
   * @param sourceFile - ソースファイル
   * @returns Zodオブジェクト情報
   */
  private extractZodSchema(node: ts.CallExpression, name: string, filePath: string, sourceFile: ts.SourceFile): ZodObjectInfo | null {
    if (node.arguments.length === 0 || !node.arguments[0] || !ts.isObjectLiteralExpression(node.arguments[0])) {
      return null;
    }

    const objectLiteral = node.arguments[0];
    const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;

    const schema: ZodSchemaStructure = {
      type: 'object',
      properties: this.parseZodObjectProperties(objectLiteral)
    };

    const zodObjectInfo: ZodObjectInfo = {
      name,
      filePath,
      schema,
      exportType: 'const', // 後で上書きされる
      importPath: this.generateImportPath(filePath),
      startLine,
      endLine
    };

    // JSDocコメントの抽出（変数宣言から）
    if (node.parent) {
      const jsDocComment = this.extractJSDoc(node.parent);
      if (jsDocComment) {
        zodObjectInfo.jsDocComment = jsDocComment;
      }
    }

    return zodObjectInfo;
  }

  /**
   * Zodオブジェクトのプロパティを解析
   * @param objectLiteral - オブジェクトリテラル式
   * @returns フィールド情報のレコード
   */
  private parseZodObjectProperties(objectLiteral: ts.ObjectLiteralExpression): Record<string, ZodFieldInfo> {
    const properties: Record<string, ZodFieldInfo> = {};

    objectLiteral.properties.forEach(prop => {
      if (ts.isPropertyAssignment(prop) && prop.name && prop.initializer) {
        const fieldName = ts.isIdentifier(prop.name) ? this.getIdentifierName(prop.name) : this.getNodeText(prop.name);
        const fieldInfo = this.analyzeZodField(prop.initializer, fieldName);
        if (fieldInfo) {
          properties[fieldName] = fieldInfo;
        }
      }
    });

    return properties;
  }

  /**
   * Zodフィールドを解析
   * @param expression - 式ノード
   * @param fieldName - フィールド名
   * @returns Zodフィールド情報
   */
  private analyzeZodField(expression: ts.Expression, fieldName: string): ZodFieldInfo | null {
    try {
      const fieldInfo: ZodFieldInfo = {
        name: fieldName,
        type: this.extractZodType(expression),
        optional: this.hasOptionalChain(expression),
        nullable: this.hasNullableChain(expression),
        validations: this.extractValidations(expression)
      };

      // デフォルト値の抽出
      const defaultValue = this.extractDefaultValue(expression);
      if (defaultValue !== undefined) {
        fieldInfo.defaultValue = defaultValue;
      }

      return fieldInfo;
    } catch (error) {
      this.addError('parse_error', `Zodフィールド解析エラー (${fieldName}): ${error}`);
      return null;
    }
  }

  /**
   * Zodタイプを抽出
   * @param expr - 式ノード
   * @returns Zodタイプ文字列
   */
  private extractZodType(expr: ts.Expression): string {
    if (ts.isCallExpression(expr)) {
      return this.analyzeZodCallChain(expr);
    }
    return 'unknown';
  }

  /**
   * Zodメソッドチェーンを解析
   * @param call - 呼び出し式
   * @returns Zodタイプ文字列
   */
  private analyzeZodCallChain(call: ts.CallExpression): string {
    const chain: string[] = [];
    let current: ts.Expression = call;

    // チェーンを逆順でたどって基本型を見つける
    while (ts.isCallExpression(current)) {
      if (ts.isPropertyAccessExpression(current.expression) && ts.isIdentifier(current.expression.name)) {
        const methodName = this.getIdentifierName(current.expression.name);
        chain.unshift(methodName);
        current = current.expression.expression;
      } else {
        break;
      }
    }

    // 基本型を取得 (z.string, z.number など)
    if (ts.isPropertyAccessExpression(current) && 
        ts.isIdentifier(current.expression) &&
        this.getIdentifierName(current.expression) === 'z' &&
        ts.isIdentifier(current.name)) {
      const baseType = this.getIdentifierName(current.name);
      return baseType;
    }

    return chain[0] || 'unknown';
  }

  /**
   * .optional() が含まれているかチェック
   * @param expression - 式ノード
   * @returns オプショナルかどうか
   */
  private hasOptionalChain(expression: ts.Expression): boolean {
    return this.hasMethodInChain(expression, 'optional');
  }

  /**
   * .nullable() が含まれているかチェック
   * @param expression - 式ノード
   * @returns Nullableかどうか
   */
  private hasNullableChain(expression: ts.Expression): boolean {
    return this.hasMethodInChain(expression, 'nullable');
  }

  /**
   * チェーンに特定のメソッドが含まれているかチェック
   * @param expression - 式ノード
   * @param methodName - メソッド名
   * @returns メソッドが含まれているかどうか
   */
  private hasMethodInChain(expression: ts.Expression, methodName: string): boolean {
    let current: ts.Expression = expression;

    while (ts.isCallExpression(current)) {
      if (ts.isPropertyAccessExpression(current.expression) &&
          ts.isIdentifier(current.expression.name) &&
          this.getIdentifierName(current.expression.name) === methodName) {
        return true;
      }
      current = current.expression;
    }

    return false;
  }

  /**
   * バリデーション情報を抽出
   * @param expression - 式ノード
   * @returns バリデーションルールの配列
   */
  private extractValidations(expression: ts.Expression): ValidationRule[] {
    const validations: ValidationRule[] = [];
    let current: ts.Expression = expression;

    while (ts.isCallExpression(current)) {
      if (ts.isPropertyAccessExpression(current.expression) && ts.isIdentifier(current.expression.name)) {
        const methodName = this.getIdentifierName(current.expression.name);
        const validation = this.mapValidationRule(methodName, current.arguments);
        
        if (validation) {
          validations.push(validation);
        }
      }
      current = current.expression;
    }

    return validations;
  }

  /**
   * メソッド名をバリデーションルールにマップ
   * @param methodName - メソッド名
   * @param args - 引数の配列
   * @returns バリデーションルール
   */
  private mapValidationRule(methodName: string, args: ts.NodeArray<ts.Expression>): ValidationRule | null {
    switch (methodName) {
      case 'min':
        return {
          type: 'min',
          value: this.extractArgumentValue(args[0]),
          message: args.length > 1 ? this.extractArgumentValue(args[1]) : undefined
        };
      case 'max':
        return {
          type: 'max',
          value: this.extractArgumentValue(args[0]),
          message: args.length > 1 ? this.extractArgumentValue(args[1]) : undefined
        };
      case 'email':
        return {
          type: 'email',
          message: args.length > 0 ? this.extractArgumentValue(args[0]) : undefined
        };
      case 'url':
        return {
          type: 'url',
          message: args.length > 0 ? this.extractArgumentValue(args[0]) : undefined
        };
      case 'regex':
      case 'pattern':
        return {
          type: 'regex',
          pattern: this.extractArgumentValue(args[0]),
          message: args.length > 1 ? this.extractArgumentValue(args[1]) : undefined
        };
      case 'optional':
        return {
          type: 'optional'
        };
      case 'nullable':
        return {
          type: 'nullable'
        };
      case 'default':
        return {
          type: 'default',
          value: this.extractArgumentValue(args[0])
        };
      default:
        return null;
    }
  }

  /**
   * ノードから安全にテキストを取得
   * @param node - ASTノード
   * @returns ノードのテキスト
   */
  private getNodeText(node: ts.Node): string {
    try {
      // 基本的なリテラル値を直接取得
      if (ts.isStringLiteral(node)) {
        return `"${node.text}"`;
      }
      if (ts.isNumericLiteral(node)) {
        return node.text;
      }
      if (node.kind === ts.SyntaxKind.TrueKeyword) {
        return 'true';
      }
      if (node.kind === ts.SyntaxKind.FalseKeyword) {
        return 'false';
      }
      if (node.kind === ts.SyntaxKind.NullKeyword) {
        return 'null';
      }
      if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
        return 'undefined';
      }
      if (ts.isIdentifier(node)) {
        return this.getIdentifierName(node);
      }
      
      // 複雑な式の場合は kind を返す
      return ts.SyntaxKind[node.kind] || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 引数の値を抽出
   * @param arg - 引数ノード
   * @returns 引数の値
   */
  private extractArgumentValue(arg: ts.Expression | undefined): any {
    if (!arg) return undefined;

    if (ts.isStringLiteral(arg)) {
      return arg.text;
    }
    if (ts.isNumericLiteral(arg)) {
      return parseFloat(arg.text);
    }
    if (arg.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    }
    if (arg.kind === ts.SyntaxKind.FalseKeyword) {
      return false;
    }
    if (arg.kind === ts.SyntaxKind.NullKeyword) {
      return null;
    }

    // 複雑な式の場合は文字列として返す
    return this.getNodeText(arg);
  }

  /**
   * デフォルト値を抽出
   * @param expression - 式ノード
   * @returns デフォルト値
   */
  private extractDefaultValue(expression: ts.Expression): any {
    let current: ts.Expression = expression;

    while (ts.isCallExpression(current)) {
      if (ts.isPropertyAccessExpression(current.expression) &&
          ts.isIdentifier(current.expression.name) &&
          this.getIdentifierName(current.expression.name) === 'default') {
        return this.extractArgumentValue(current.arguments[0]);
      }
      current = current.expression;
    }

    return undefined;
  }

  /**
   * エクスポートされているかどうかを判定
   * @param node - ノード
   * @returns エクスポートされているかどうか
   */
  private hasExportModifier(node: ts.Node & { modifiers?: ts.NodeArray<ts.ModifierLike> }): boolean {
    return node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) || false;
  }

  /**
   * JSDocコメントを抽出
   * @param node - ノード
   * @returns JSDocコメント
   */
  private extractJSDoc(node: ts.Node | undefined): string | undefined {
    if (!node) return undefined;
    
    const jsDocTags = ts.getJSDocTags(node);
    if (jsDocTags.length > 0) {
      return jsDocTags.map(tag => tag.comment || '').join('\n').trim() || undefined;
    }
    return undefined;
  }

  /**
   * インポートパスを生成
   * @param filePath - ファイルパス
   * @returns インポート用パス
   */
  private generateImportPath(filePath: string): string {
    const parsed = path.parse(filePath);
    return `./${path.join(parsed.dir, parsed.name).replace(/\\/g, '/')}`;
  }

  /**
   * エラーを追加
   * @param type - エラータイプ
   * @param message - エラーメッセージ
   * @param filePath - ファイルパス
   * @param line - 行番号
   */
  private addError(type: AnalysisError['type'], message: string, filePath?: string, line?: number): void {
    this.errors.push({
      type,
      message,
      filePath,
      line
    });
  }

  /**
   * 解析エラーを取得
   * @returns 解析エラーの配列
   */
  public getErrors(): AnalysisError[] {
    return [...this.errors];
  }

  /**
   * エラーをクリア
   */
  public clearErrors(): void {
    this.errors = [];
  }
}

/**
 * Zodスキーマ定義を解析してスキーマ情報を抽出
 * @param targetPath - 対象ディレクトリパス
 * @param options - 解析オプション
 * @returns Zodオブジェクト情報の配列
 */
export async function analyzeZodSchemas(
  targetPath: string,
  options?: ZodAnalysisOptions
): Promise<ZodObjectInfo[]> {
  const analyzer = new ZodSchemaAnalyzer();
  
  try {
    // TypeScriptファイルを検索
    const files = await findTypeScriptFiles(targetPath);
    
    if (files.length === 0) {
      console.warn(`TypeScriptファイルが見つかりません: ${targetPath}`);
      return [];
    }

    // TypeScriptプログラムを作成
    const program = (analyzer as any).createProgram(files);
    const schemas: ZodObjectInfo[] = [];

    for (const filePath of files) {
      try {
        const sourceFile = program.getSourceFile(filePath);
        if (!sourceFile) {
          console.warn(`ソースファイルが取得できません: ${filePath}`);
          continue;
        }

        // Zodスキーマを検出・解析
        const fileSchemas = (analyzer as any).detectZodSchemas(sourceFile, filePath);
        
        // 除外設定に基づいてフィルタリング
        const filteredSchemas = fileSchemas.filter((schema: ZodObjectInfo) => 
          !options?.excludeSchemas?.includes(schema.name)
        );

        schemas.push(...filteredSchemas);

        console.log(`Zod解析完了: ${filePath} (${filteredSchemas.length}個のスキーマ)`);
      } catch (error) {
        console.error(`Zodファイル解析エラー (${filePath}): ${error}`);
      }
    }

    return schemas;
  } catch (error) {
    console.error(`Zod解析エラー: ${error}`);
    throw error;
  }
}

/**
 * TypeScriptファイルを再帰的に検索
 * @param targetPath - 検索対象ディレクトリ
 * @returns TypeScriptファイルのパス配列
 */
async function findTypeScriptFiles(targetPath: string): Promise<string[]> {
  const files: string[] = [];
  const defaultExcludes = ['node_modules', 'dist', 'build', '.git'];

  function isExcluded(filePath: string): boolean {
    return defaultExcludes.some(pattern => filePath.includes(pattern));
  }

  function scanDirectory(dir: string): void {
    if (!fs.existsSync(dir) || isExcluded(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.d.ts')) {
        if (!isExcluded(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  }

  scanDirectory(targetPath);
  return files;
}
