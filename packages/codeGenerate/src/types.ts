/**
 * electron-flow コア解析エンジンの型定義
 * Phase 2で実装される解析結果の詳細な型定義を提供
 */

/**
 * TypeScript型情報の詳細定義
 */
export interface TypeInfo {
  /** 型の文字列表現 (例: "string", "Promise<User>", "User[]") */
  text: string;
  /** TypeScript型の種類 (例: "string", "number", "object", "array", "promise") */
  kind: string;
  /** 配列型かどうか */
  isArray: boolean;
  /** Promise型かどうか */
  isPromise: boolean;
  /** ジェネリック引数の型情報 */
  genericArgs?: TypeInfo[] | undefined;
  /** Unionタイプの場合の構成要素 */
  unionTypes?: TypeInfo[] | undefined;
  /** オブジェクト型の場合のプロパティ情報 */
  properties?: Record<string, TypeInfo> | undefined;
}

/**
 * 関数パラメータの詳細情報
 */
export interface ParameterInfo {
  /** パラメータ名 */
  name: string;
  /** 型情報 */
  type: TypeInfo;
  /** オプショナルパラメータかどうか */
  isOptional: boolean;
  /** デフォルト値（文字列表現） */
  defaultValue?: string | undefined;
  /** パラメータの位置（0から開始） */
  position: number;
  /** JSDocコメント */
  jsDocComment?: string | undefined;
}

/**
 * 関数情報の詳細定義
 */
export interface FunctionInfo {
  /** 関数名 */
  name: string;
  /** パラメータ情報のリスト */
  parameters: ParameterInfo[];
  /** 戻り値の型情報 */
  returnType: TypeInfo;
  /** 非同期関数かどうか */
  isAsync: boolean;
  /** エクスポートされているかどうか */
  isExported: boolean;
  /** ソースファイルのパス */
  filePath: string;
  /** インポート用パス */
  importPath: string;
  /** JSDocコメント */
  jsDocComment?: string | undefined;
  /** 関数の開始行番号 */
  startLine?: number | undefined;
  /** 関数の終了行番号 */
  endLine?: number | undefined;
}

/**
 * インポート情報
 */
export interface ImportInfo {
  /** インポート元モジュール名 */
  moduleName: string;
  /** インポートされた名前のリスト */
  importedNames: string[];
  /** デフォルトインポートかどうか */
  isDefaultImport: boolean;
  /** エイリアス名 */
  alias?: string | undefined;
  /** 名前付きインポートの詳細 */
  namedImports?: Array<{
    name: string;
    alias?: string | undefined;
  }> | undefined;
}

/**
 * エクスポート情報
 */
export interface ExportInfo {
  /** エクスポートされる名前 */
  name: string;
  /** エクスポートのタイプ */
  type: 'function' | 'variable' | 'class' | 'interface' | 'type';
  /** デフォルトエクスポートかどうか */
  isDefault: boolean;
  /** 元の名前（再エクスポートの場合） */
  originalName?: string | undefined;
  /** エクスポート元モジュール（再エクスポートの場合） */
  fromModule?: string | undefined;
}

/**
 * パッケージ情報の詳細定義
 */
export interface PackageInfo {
  /** パッケージ名（ファイル名から生成） */
  packageName: string;
  /** ファイルパス */
  filePath: string;
  /** 関数情報のリスト */
  functions: FunctionInfo[];
  /** インポート情報のリスト */
  imports: ImportInfo[];
  /** エクスポート情報のリスト */
  exports: ExportInfo[];
  /** 依存関係の情報 */
  dependencies?: string[];
}

/**
 * Zodバリデーションルール
 */
export interface ValidationRule {
  /** バリデーションタイプ */
  type: 'min' | 'max' | 'email' | 'url' | 'regex' | 'custom' | 'optional' | 'nullable' | 'default';
  /** バリデーション値 */
  value?: any;
  /** カスタムエラーメッセージ */
  message?: string;
  /** 正規表現パターン（regexタイプの場合） */
  pattern?: string;
  /** フラグ（regexタイプの場合） */
  flags?: string;
}

/**
 * Zodフィールドの詳細情報
 */
export interface ZodFieldInfo {
  /** フィールド名 */
  name: string;
  /** Zodタイプ（例: "string", "number", "object", "array"） */
  type: string;
  /** オプショナルフィールドかどうか */
  optional: boolean;
  /** Nullable フィールドかどうか */
  nullable: boolean;
  /** バリデーションルールのリスト */
  validations: ValidationRule[];
  /** デフォルト値 */
  defaultValue?: any;
  /** ネストされたオブジェクトの場合の子フィールド */
  children?: ZodFieldInfo[];
  /** 配列の場合の要素タイプ */
  arrayElementType?: ZodFieldInfo;
  /** Union タイプの場合の選択肢 */
  unionOptions?: ZodFieldInfo[];
  /** JSDocコメント */
  jsDocComment?: string;
}

/**
 * Zodスキーマの構造情報
 */
export interface ZodSchemaStructure {
  /** スキーマタイプ */
  type: 'object' | 'array' | 'union' | 'intersection' | 'primitive' | 'enum' | 'literal';
  /** オブジェクトタイプの場合のプロパティ */
  properties?: Record<string, ZodFieldInfo>;
  /** 配列タイプの場合の要素情報 */
  items?: ZodSchemaStructure;
  /** Union タイプの場合の選択肢 */
  options?: ZodSchemaStructure[];
  /** プリミティブタイプの場合の具体的な型 */
  primitive?: 'string' | 'number' | 'boolean' | 'date' | 'bigint';
  /** Enum タイプの場合の値リスト */
  enumValues?: Array<string | number>;
  /** Literal タイプの場合の値 */
  literalValue?: any;
}

/**
 * Zodオブジェクト情報の詳細定義
 */
export interface ZodObjectInfo {
  /** スキーマ名 */
  name: string;
  /** ファイルパス */
  filePath: string;
  /** スキーマ構造 */
  schema: ZodSchemaStructure;
  /** エクスポートタイプ（例: "const", "export const"） */
  exportType: string;
  /** z.infer<typeof schema> の型名 */
  inferredTypeName?: string;
  /** インポート用パス */
  importPath: string;
  /** JSDocコメント */
  jsDocComment?: string;
  /** スキーマの開始行番号 */
  startLine?: number;
  /** スキーマの終了行番号 */
  endLine?: number;
}

/**
 * 解析結果の統合情報
 */
export interface AnalysisResult {
  /** パッケージ情報のリスト */
  packages: PackageInfo[];
  /** Zodスキーマ情報のリスト */
  zodSchemas: ZodObjectInfo[];
  /** 解析エラーのリスト */
  errors: AnalysisError[];
  /** 解析統計情報 */
  statistics: AnalysisStatistics;
}

/**
 * 解析エラー情報
 */
export interface AnalysisError {
  /** エラータイプ */
  type: 'parse_error' | 'type_error' | 'validation_error' | 'file_error';
  /** エラーメッセージ */
  message: string;
  /** ファイルパス */
  filePath?: string | undefined;
  /** 行番号 */
  line?: number | undefined;
  /** 列番号 */
  column?: number | undefined;
  /** 詳細情報 */
  details?: any;
}

/**
 * 解析統計情報
 */
export interface AnalysisStatistics {
  /** 解析したファイル数 */
  totalFiles: number;
  /** 発見した関数数 */
  totalFunctions: number;
  /** 発見したZodスキーマ数 */
  totalZodSchemas: number;
  /** 解析エラー数 */
  errorCount: number;
  /** 解析時間（ミリ秒） */
  analysisTimeMs: number;
  /** 使用メモリ量（バイト） */
  memoryUsage?: number;
}

/**
 * ビルド結果の詳細定義
 */
export interface BuildResult {
  /** Zodオブジェクト情報のリスト */
  zodObjectInfos: ZodObjectInfo[];
  /** パッケージ情報のリスト */
  packages: PackageInfo[];
  /** 解析結果の詳細 */
  analysisResult?: AnalysisResult;
  /** ビルド成功フラグ */
  success: boolean;
  /** ビルド時間（ミリ秒） */
  buildTimeMs: number;
}

/**
 * ファイル解析のオプション
 */
export interface ParseOptions {
  /** 対象ディレクトリパス */
  targetPath: string;
  /** 除外する関数名のリスト */
  ignores: string[];
  /** 除外するファイルパターン */
  excludePatterns?: string[];
  /** 並列処理の同時実行数 */
  concurrency?: number;
  /** 詳細ログを出力するかどうか */
  verbose?: boolean;
  /** TypeScriptコンパイラーオプション */
  compilerOptions?: any;
}

/**
 * Zod解析のオプション
 */
export interface ZodAnalysisOptions {
  /** 対象ディレクトリパス */
  targetPath: string;
  /** 除外するスキーマ名のリスト */
  excludeSchemas?: string[];
  /** 深いネスト構造を解析するかどうか */
  analyzeDeepNesting?: boolean;
  /** 最大ネスト深度 */
  maxNestingDepth?: number;
}