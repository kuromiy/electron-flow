/**
 * TypeScript Compiler APIを使用したAST解析エンジン
 * Phase 2で実装: TypeScript APIファイルを解析してメタデータを抽出
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import type { 
  PackageInfo, 
  FunctionInfo, 
  ParameterInfo, 
  TypeInfo, 
  ImportInfo, 
  ExportInfo, 
  ParseOptions,
  AnalysisError
} from './types.js';

/**
 * TypeScript ASTパーサークラス
 * TypeScript Compiler APIを使用してソースコードを解析する
 */
export class ASTParser {
  private program: ts.Program | null = null;
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
   * ソースファイルを解析して関数情報を抽出
   * @param sourceFile - TypeScriptソースファイル
   * @param filePath - ファイルパス
   * @returns 関数情報の配列
   */
  public parseSourceFile(sourceFile: ts.SourceFile, filePath: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const visit = (node: ts.Node): void => {
      try {
        if (ts.isFunctionDeclaration(node)) {
          const functionInfo = this.parseFunctionDeclaration(node, filePath, sourceFile);
          if (functionInfo) {
            functions.push(functionInfo);
          }
        }
        // アロー関数の解析
        else if (ts.isVariableStatement(node)) {
          const arrowFunctions = this.parseArrowFunctions(node, filePath, sourceFile);
          functions.push(...arrowFunctions);
        }
        
        ts.forEachChild(node, visit);
      } catch (error) {
        this.addError('parse_error', `関数解析エラー: ${error}`, filePath, 
                     node.getStart ? sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1 : undefined);
      }
    };

    visit(sourceFile);
    return functions;
  }

  /**
   * ソースファイルからインポート情報を抽出
   * @param sourceFile - TypeScriptソースファイル
   * @returns インポート情報の配列
   */
  public parseImports(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        try {
          const importInfo = this.parseImportDeclaration(node);
          if (importInfo) {
            imports.push(importInfo);
          }
        } catch (error) {
          this.addError('parse_error', `インポート解析エラー: ${error}`);
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * インポート宣言を解析
   * @param node - インポート宣言ノード
   * @returns インポート情報
   */
  private parseImportDeclaration(node: ts.ImportDeclaration): ImportInfo | null {
    if (!ts.isStringLiteral(node.moduleSpecifier)) {
      return null;
    }

    const moduleName = node.moduleSpecifier.text;
    const importClause = node.importClause;

    if (!importClause) {
      // import "module" の形式
      return {
        moduleName,
        importedNames: [],
        isDefaultImport: false
      };
    }

    const importedNames: string[] = [];
    const namedImports: Array<{ name: string; alias?: string }> = [];
    let isDefaultImport = false;
    let alias: string | undefined;

    // デフォルトインポート
    if (importClause.name) {
      isDefaultImport = true;
      alias = this.getIdentifierName(importClause.name);
      importedNames.push(alias);
    }

    // 名前付きインポート
    if (importClause.namedBindings) {
      if (ts.isNamespaceImport(importClause.namedBindings)) {
        // import * as name from "module"
        const namespaceName = this.getIdentifierName(importClause.namedBindings.name);
        importedNames.push(namespaceName);
        alias = namespaceName;
      } else if (ts.isNamedImports(importClause.namedBindings)) {
        // import { a, b as c } from "module"
        importClause.namedBindings.elements.forEach(element => {
          const name = this.getIdentifierName(element.name);
          const originalName = element.propertyName ? this.getIdentifierName(element.propertyName) : name;
          
          importedNames.push(name);
          const namedImport: { name: string; alias?: string } = {
            name: originalName
          };
          if (element.propertyName) {
            namedImport.alias = name;
          }
          namedImports.push(namedImport);
        });
      }
    }

    const importInfo: ImportInfo = {
      moduleName,
      importedNames,
      isDefaultImport
    };
    
    if (alias) {
      importInfo.alias = alias;
    }
    
    if (namedImports.length > 0) {
      importInfo.namedImports = namedImports;
    }
    
    return importInfo;
  }

  /**
   * ソースファイルからエクスポート情報を抽出
   * @param sourceFile - TypeScriptソースファイル
   * @returns エクスポート情報の配列
   */
  public parseExports(sourceFile: ts.SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];

    const visit = (node: ts.Node): void => {
      try {
        // export function declaration
        if (ts.isFunctionDeclaration(node) && this.hasExportModifier(node)) {
          const name = node.name ? this.getIdentifierName(node.name) : undefined;
          if (name) {
            exports.push({
              name,
              type: 'function',
              isDefault: false
            });
          }
        }
        // export variable declaration
        else if (ts.isVariableStatement(node) && this.hasExportModifier(node)) {
          node.declarationList.declarations.forEach(declaration => {
            if (ts.isIdentifier(declaration.name)) {
              const name = this.getIdentifierName(declaration.name);
              exports.push({
                name,
                type: 'variable',
                isDefault: false
              });
            }
          });
        }
        // export class declaration
        else if (ts.isClassDeclaration(node) && this.hasExportModifier(node)) {
          const name = node.name ? this.getIdentifierName(node.name) : undefined;
          if (name) {
            exports.push({
              name,
              type: 'class',
              isDefault: false
            });
          }
        }
        // export interface declaration
        else if (ts.isInterfaceDeclaration(node) && this.hasExportModifier(node)) {
          const name = node.name ? this.getIdentifierName(node.name) : undefined;
          if (name) {
            exports.push({
              name,
              type: 'interface',
              isDefault: false
            });
          }
        }
        // export type declaration
        else if (ts.isTypeAliasDeclaration(node) && this.hasExportModifier(node)) {
          const name = node.name ? this.getIdentifierName(node.name) : undefined;
          if (name) {
            exports.push({
              name,
              type: 'type',
              isDefault: false
            });
          }
        }
        // export declaration
        else if (ts.isExportDeclaration(node)) {
          const exportInfo = this.parseExportDeclaration(node);
          exports.push(...exportInfo);
        }
        // export assignment (export default)
        else if (ts.isExportAssignment(node)) {
          if (node.isExportEquals) {
            // export = 
            exports.push({
              name: 'default',
              type: 'variable',
              isDefault: true
            });
          } else {
            // export default
            exports.push({
              name: 'default',
              type: 'variable',
              isDefault: true
            });
          }
        }
        
        ts.forEachChild(node, visit);
      } catch (error) {
        this.addError('parse_error', `エクスポート解析エラー: ${error}`);
      }
    };

    visit(sourceFile);
    return exports;
  }

  /**
   * エクスポート宣言を解析
   * @param node - エクスポート宣言ノード
   * @returns エクスポート情報の配列
   */
  private parseExportDeclaration(node: ts.ExportDeclaration): ExportInfo[] {
    const exports: ExportInfo[] = [];

    if (!node.exportClause) {
      // export * from "module"
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        exports.push({
          name: '*',
          type: 'variable',
          isDefault: false,
          fromModule: node.moduleSpecifier.text
        });
      }
    } else if (ts.isNamedExports(node.exportClause)) {
      // export { a, b as c } from "module"
      node.exportClause.elements.forEach(element => {
        const name = this.getIdentifierName(element.name);
        const originalName = element.propertyName ? this.getIdentifierName(element.propertyName) : name;
        
        const exportInfo: ExportInfo = {
          name,
          type: 'variable',
          isDefault: false
        };
        
        if (element.propertyName) {
          exportInfo.originalName = originalName;
        }
        
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          exportInfo.fromModule = node.moduleSpecifier.text;
        }
        
        exports.push(exportInfo);
      });
    }

    return exports;
  }

  /**
   * 関数宣言を解析
   * @param node - 関数宣言ノード
   * @param filePath - ファイルパス
   * @param sourceFile - ソースファイル
   * @returns 関数情報
   */
  private parseFunctionDeclaration(node: ts.FunctionDeclaration, filePath: string, sourceFile: ts.SourceFile): FunctionInfo | null {
    const name = node.name ? this.getIdentifierName(node.name) : undefined;
    if (!name) {
      return null; // 無名関数はスキップ
    }

    try {
      const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;

      return {
        name,
        parameters: this.parseParameters(node.parameters),
        returnType: this.extractTypeInfo(node.type),
        isAsync: this.hasAsyncModifier(node),
        isExported: this.hasExportModifier(node),
        filePath,
        importPath: this.generateImportPath(filePath),
        jsDocComment: this.extractJSDoc(node),
        startLine,
        endLine
      };
    } catch (error) {
      this.addError('parse_error', `関数宣言解析エラー (${name}): ${error}`, filePath);
      return null;
    }
  }

  /**
   * アロー関数を解析（変数宣言から）
   * @param node - 変数宣言ステートメント
   * @param filePath - ファイルパス
   * @param sourceFile - ソースファイル
   * @returns 関数情報の配列
   */
  private parseArrowFunctions(node: ts.VariableStatement, filePath: string, sourceFile: ts.SourceFile): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    node.declarationList.declarations.forEach(declaration => {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        const name = this.getIdentifierName(declaration.name);
        
        if (ts.isArrowFunction(declaration.initializer)) {
          try {
            const arrowFunction = declaration.initializer;
            const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
            const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;

            const functionInfo: FunctionInfo = {
              name,
              parameters: this.parseParameters(arrowFunction.parameters),
              returnType: this.extractTypeInfo(arrowFunction.type),
              isAsync: arrowFunction.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
              isExported: this.hasExportModifier(node),
              filePath,
              importPath: this.generateImportPath(filePath),
              jsDocComment: this.extractJSDoc(node),
              startLine,
              endLine
            };

            functions.push(functionInfo);
          } catch (error) {
            this.addError('parse_error', `アロー関数解析エラー (${name}): ${error}`, filePath);
          }
        }
      }
    });

    return functions;
  }

  /**
   * パラメータを解析
   * @param params - パラメータ宣言の配列
   * @returns パラメータ情報の配列
   */
  private parseParameters(params: ts.NodeArray<ts.ParameterDeclaration>): ParameterInfo[] {
    return params.map((param, index) => {
      try {
        return {
          name: param.name && ts.isIdentifier(param.name) ? this.getIdentifierName(param.name) : `param${index}`,
          type: this.extractTypeInfo(param.type),
          isOptional: !!param.questionToken,
          defaultValue: param.initializer ? this.getNodeText(param.initializer) : undefined,
          position: index,
          jsDocComment: this.extractJSDoc(param)
        };
      } catch (error) {
        this.addError('parse_error', `パラメータ解析エラー: ${error}`);
        return {
          name: `param${index}`,
          type: { text: 'any', kind: 'any', isArray: false, isPromise: false },
          isOptional: !!param.questionToken,
          position: index
        };
      }
    });
  }

  /**
   * 型情報を抽出
   * @param typeNode - 型ノード
   * @returns 型情報
   */
  private extractTypeInfo(typeNode: ts.TypeNode | undefined): TypeInfo {
    if (!typeNode) {
      return { text: 'any', kind: 'any', isArray: false, isPromise: false };
    }

    try {
      const typeText = this.getTypeText(typeNode);
      const kind = this.determineTypeKind(typeNode);
      
      return {
        text: typeText,
        kind: kind,
        isArray: this.isArrayType(typeNode),
        isPromise: this.isPromiseType(typeNode),
        genericArgs: this.extractGenericArgs(typeNode),
        unionTypes: this.extractUnionTypes(typeNode),
        properties: this.extractObjectProperties(typeNode)
      };
    } catch (error) {
      this.addError('type_error', `型解析エラー: ${error}`);
      return { text: 'any', kind: 'any', isArray: false, isPromise: false };
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
   * 型テキストを安全に取得
   * @param typeNode - 型ノード
   * @returns 型テキスト
   */
  private getTypeText(typeNode: ts.TypeNode): string {
    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword:
        return 'string';
      case ts.SyntaxKind.NumberKeyword:
        return 'number';
      case ts.SyntaxKind.BooleanKeyword:
        return 'boolean';
      case ts.SyntaxKind.VoidKeyword:
        return 'void';
      case ts.SyntaxKind.TypeReference:
        const typeRefNode = typeNode as ts.TypeReferenceNode;
        if (ts.isIdentifier(typeRefNode.typeName)) {
          const typeName = this.getIdentifierName(typeRefNode.typeName);
          if (typeRefNode.typeArguments && typeRefNode.typeArguments.length > 0) {
            const genericArgs = typeRefNode.typeArguments.map(arg => this.getTypeText(arg)).join(', ');
            return `${typeName}<${genericArgs}>`;
          }
          return typeName;
        }
        return 'unknown';
      case ts.SyntaxKind.ArrayType:
        const arrayType = typeNode as ts.ArrayTypeNode;
        return `${this.getTypeText(arrayType.elementType)}[]`;
      case ts.SyntaxKind.UnionType:
        const unionType = typeNode as ts.UnionTypeNode;
        return unionType.types.map(type => this.getTypeText(type)).join(' | ');
      case ts.SyntaxKind.IntersectionType:
        const intersectionType = typeNode as ts.IntersectionTypeNode;
        return intersectionType.types.map(type => this.getTypeText(type)).join(' & ');
      case ts.SyntaxKind.TypeLiteral:
        return 'object';
      default:
        return ts.SyntaxKind[typeNode.kind] || 'unknown';
    }
  }

  /**
   * 型の種類を判定
   * @param typeNode - 型ノード
   * @returns 型の種類
   */
  private determineTypeKind(typeNode: ts.TypeNode): string {
    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword:
        return 'string';
      case ts.SyntaxKind.NumberKeyword:
        return 'number';
      case ts.SyntaxKind.BooleanKeyword:
        return 'boolean';
      case ts.SyntaxKind.VoidKeyword:
        return 'void';
      case ts.SyntaxKind.TypeReference:
        const typeRefNode = typeNode as ts.TypeReferenceNode;
        if (ts.isIdentifier(typeRefNode.typeName)) {
          const typeName = this.getIdentifierName(typeRefNode.typeName);
          if (typeName === 'Promise') return 'promise';
          if (typeName === 'Array') return 'array';
        }
        return 'reference';
      case ts.SyntaxKind.ArrayType:
        return 'array';
      case ts.SyntaxKind.UnionType:
        return 'union';
      case ts.SyntaxKind.IntersectionType:
        return 'intersection';
      case ts.SyntaxKind.TypeLiteral:
        return 'object';
      default:
        return 'unknown';
    }
  }

  /**
   * Promise型かどうかを判定
   * @param typeNode - 型ノード
   * @returns Promise型かどうか
   */
  private isPromiseType(typeNode: ts.TypeNode): boolean {
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
      const typeName = this.getIdentifierName(typeNode.typeName);
      return typeName === 'Promise';
    }
    return false;
  }

  /**
   * 配列型かどうかを判定
   * @param typeNode - 型ノード
   * @returns 配列型かどうか
   */
  private isArrayType(typeNode: ts.TypeNode): boolean {
    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
      return true;
    }
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
      const typeName = this.getIdentifierName(typeNode.typeName);
      return typeName === 'Array';
    }
    return false;
  }

  /**
   * ジェネリック引数を抽出
   * @param typeNode - 型ノード
   * @returns ジェネリック引数の型情報配列
   */
  private extractGenericArgs(typeNode: ts.TypeNode): TypeInfo[] | undefined {
    if (ts.isTypeReferenceNode(typeNode) && typeNode.typeArguments) {
      return typeNode.typeArguments.map(arg => this.extractTypeInfo(arg));
    }
    return undefined;
  }

  /**
   * Union型の構成要素を抽出
   * @param typeNode - 型ノード
   * @returns Union型の構成要素
   */
  private extractUnionTypes(typeNode: ts.TypeNode): TypeInfo[] | undefined {
    if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.map(type => this.extractTypeInfo(type));
    }
    return undefined;
  }

  /**
   * オブジェクト型のプロパティを抽出
   * @param typeNode - 型ノード
   * @returns プロパティの型情報
   */
  private extractObjectProperties(typeNode: ts.TypeNode): Record<string, TypeInfo> | undefined {
    if (ts.isTypeLiteralNode(typeNode)) {
      const properties: Record<string, TypeInfo> = {};
      
      typeNode.members.forEach(member => {
        if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
          const propertyName = this.getIdentifierName(member.name);
          const propertyType = this.extractTypeInfo(member.type);
          properties[propertyName] = propertyType;
        }
      });
      
      return Object.keys(properties).length > 0 ? properties : undefined;
    }
    return undefined;
  }

  /**
   * 非同期関数かどうかを判定
   * @param node - 関数ノード
   * @returns 非同期関数かどうか
   */
  private hasAsyncModifier(node: ts.FunctionDeclaration | ts.VariableStatement): boolean {
    return node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) || false;
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
  private extractJSDoc(node: ts.Node): string | undefined {
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
 * TypeScriptファイルを解析してAPI関数情報を抽出
 * @param targetPath - 対象ディレクトリパス
 * @param ignores - 除外する関数名のリスト
 * @param options - 解析オプション
 * @returns パッケージ情報の配列
 */
export async function parseTypeScriptFiles(
  targetPath: string,
  ignores: string[] = [],
  options?: ParseOptions
): Promise<PackageInfo[]> {
  const parser = new ASTParser();
  
  try {
    // TypeScriptファイルを検索
    const files = await findTypeScriptFiles(targetPath, options?.excludePatterns);
    
    if (files.length === 0) {
      console.warn(`TypeScriptファイルが見つかりません: ${targetPath}`);
      return [];
    }

    // TypeScriptプログラムを作成
    const program = (parser as any).createProgram(files, options?.compilerOptions);
    const packages: PackageInfo[] = [];

    for (const filePath of files) {
      try {
        const sourceFile = program.getSourceFile(filePath);
        if (!sourceFile) {
          console.warn(`ソースファイルが取得できません: ${filePath}`);
          continue;
        }

        // 関数情報を抽出
        const functions = (parser as any).parseSourceFile(sourceFile, filePath);
        
        // インポート/エクスポート情報を抽出
        const imports = (parser as any).parseImports(sourceFile);
        const exports = (parser as any).parseExports(sourceFile);
        
        // ignoresに含まれる関数を除外
        const filteredFunctions = functions.filter((func: FunctionInfo) => 
          !ignores.includes(func.name)
        );

        // パッケージ情報を作成（関数がなくてもimport/export情報があれば含める）
        if (filteredFunctions.length > 0 || imports.length > 0 || exports.length > 0) {
          const packageInfo: PackageInfo = {
            packageName: path.basename(filePath, path.extname(filePath)),
            filePath,
            functions: filteredFunctions,
            imports,
            exports
          };

          packages.push(packageInfo);
        }

        if (options?.verbose) {
          console.log(`解析完了: ${filePath} (${filteredFunctions.length}個の関数)`);
        }
      } catch (error) {
        console.error(`ファイル解析エラー (${filePath}): ${error}`);
      }
    }

    return packages;
  } catch (error) {
    console.error(`TypeScript解析エラー: ${error}`);
    throw error;
  }
}

/**
 * TypeScriptファイルを再帰的に検索
 * @param targetPath - 検索対象ディレクトリ
 * @param excludePatterns - 除外パターン
 * @returns TypeScriptファイルのパス配列
 */
async function findTypeScriptFiles(targetPath: string, excludePatterns?: string[]): Promise<string[]> {
  const files: string[] = [];
  const defaultExcludes = ['node_modules', 'dist', 'build', '.git'];
  const excludes = [...defaultExcludes, ...(excludePatterns || [])];

  function isExcluded(filePath: string): boolean {
    return excludes.some(pattern => filePath.includes(pattern));
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
