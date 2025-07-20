/**
 * 生成コードの品質チェックとバリデーション機能
 */

import * as ts from 'typescript';

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * バリデーションエラー
 */
export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

/**
 * バリデーション警告
 */
export interface ValidationWarning {
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

/**
 * コードバリデーター
 */
export class CodeValidator {
  /**
   * TypeScriptコードの構文チェック
   */
  validateTypeScriptSyntax(code: string, fileName = 'generated.ts'): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // TypeScriptコンパイラーオプション
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      };

      // ソースファイルを作成
      const sourceFile = ts.createSourceFile(
        fileName,
        code,
        ts.ScriptTarget.ES2022,
        true
      );

      // プログラムを作成
      const program = ts.createProgram([fileName], compilerOptions, {
        getSourceFile: (name) => name === fileName ? sourceFile : undefined,
        writeFile: () => {},
        getCurrentDirectory: () => '',
        getDirectories: () => [],
        fileExists: () => true,
        readFile: () => '',
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n',
        getDefaultLibFileName: () => 'lib.d.ts'
      });

      // 診断情報を取得
      const diagnostics = [
        ...program.getSemanticDiagnostics(sourceFile),
        ...program.getSyntacticDiagnostics(sourceFile)
      ];

      // エラーと警告を分類
      diagnostics.forEach(diagnostic => {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        const position = diagnostic.start ? 
          sourceFile.getLineAndCharacterOfPosition(diagnostic.start) : 
          undefined;

        const validationItem = {
          message,
          ...(position && {
            line: position.line + 1,
            column: position.character + 1
          }),
          code: `TS${diagnostic.code}`
        };

        if (diagnostic.category === ts.DiagnosticCategory.Error) {
          result.errors.push(validationItem);
          result.isValid = false;
        } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
          result.warnings.push(validationItem);
        }
      });

    } catch (error) {
      result.isValid = false;
      result.errors.push({
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return result;
  }

  /**
   * 生成コードの基本的な品質チェック
   */
  validateCodeQuality(code: string, type: 'preload' | 'handler' | 'types'): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 基本的なパターンチェック
    this.checkBasicPatterns(code, type, result);
    
    // TypeScript構文チェック
    const syntaxResult = this.validateTypeScriptSyntax(code);
    result.errors.push(...syntaxResult.errors);
    result.warnings.push(...syntaxResult.warnings);
    result.isValid = result.isValid && syntaxResult.isValid;

    return result;
  }

  /**
   * 基本的なパターンチェック
   */
  private checkBasicPatterns(
    code: string, 
    type: 'preload' | 'handler' | 'types', 
    result: ValidationResult
  ): void {
    switch (type) {
      case 'preload':
        this.checkPreloadPatterns(code, result);
        break;
      case 'handler':
        this.checkHandlerPatterns(code, result);
        break;
      case 'types':
        this.checkTypesPatterns(code, result);
        break;
    }
  }

  /**
   * プリロードスクリプトのパターンチェック
   */
  private checkPreloadPatterns(code: string, result: ValidationResult): void {
    // 必須パターンの確認
    if (!code.includes('electronAPI')) {
      result.errors.push({
        message: 'Missing electronAPI export'
      });
      result.isValid = false;
    }

    if (!code.includes('ipcRenderer.invoke')) {
      result.errors.push({
        message: 'Missing ipcRenderer.invoke calls'
      });
      result.isValid = false;
    }

    if (!code.includes('declare global')) {
      result.warnings.push({
        message: 'Missing global type declaration'
      });
    }
  }

  /**
   * ハンドラーコードのパターンチェック
   */
  private checkHandlerPatterns(code: string, result: ValidationResult): void {
    // 必須パターンの確認
    if (!code.includes('autoGenerateHandlers')) {
      result.errors.push({
        message: 'Missing autoGenerateHandlers export'
      });
      result.isValid = false;
    }

    if (!code.includes('handleError')) {
      result.errors.push({
        message: 'Missing error handler function'
      });
      result.isValid = false;
    }

    if (!code.includes('success: true')) {
      result.warnings.push({
        message: 'Missing success response pattern'
      });
    }
  }

  /**
   * 型定義のパターンチェック
   */
  private checkTypesPatterns(code: string, result: ValidationResult): void {
    // 必須パターンの確認
    if (!code.includes('interface ElectronAPI')) {
      result.errors.push({
        message: 'Missing ElectronAPI interface'
      });
      result.isValid = false;
    }

    if (!code.includes('Result<')) {
      result.errors.push({
        message: 'Missing Result type usage'
      });
      result.isValid = false;
    }

    if (!code.includes('declare global')) {
      result.warnings.push({
        message: 'Missing global type declaration'
      });
    }
  }
}

/**
 * コードフォーマッター（基本的な整形のみ）
 */
export class CodeFormatter {
  /**
   * 基本的なコードフォーマット
   */
  format(code: string): string {
    return code
      .split('\n')
      .map(line => line.trimEnd()) // 行末の空白を除去
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // 3つ以上の連続改行を2つに
      .trim();
  }

  /**
   * ファイルヘッダーの追加
   */
  addFileHeader(code: string, metadata: { timestamp: string; target: string }): string {
    const header = `/**
 * Auto-generated by electron-flow
 * Generated at: ${metadata.timestamp}
 * Target: ${metadata.target}
 * 
 * DO NOT MODIFY THIS FILE DIRECTLY
 * This file is automatically generated and will be overwritten
 */

`;
    return header + code;
  }
}

// エクスポート用インスタンス
export const codeValidator = new CodeValidator();
export const codeFormatter = new CodeFormatter();