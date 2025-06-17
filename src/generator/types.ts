/**
 * パーサーが解析したハンドラー関数の情報
 */
export interface ParsedHandler {
  /** 関数名 */
  name: string;
  /** 引数の型情報 */
  parameters: ParameterInfo[];
  /** 戻り値の型情報 */
  returnType: TypeInfo;
  /** ファイルパス */
  filePath: string;
  /** JSDoc コメント */
  documentation?: string;
}

/**
 * 関数パラメータの情報
 */
export interface ParameterInfo {
  /** パラメータ名 */
  name: string;
  /** 型情報 */
  type: TypeInfo;
  /** オプショナルかどうか */
  optional: boolean;
  /** デフォルト値 */
  defaultValue?: string;
}

/**
 * 型情報
 */
export interface TypeInfo {
  /** 型名 */
  name: string;
  /** 型の種類 */
  kind: TypeKind;
  /** ジェネリック型の引数 */
  typeArguments?: TypeInfo[];
  /** オブジェクト型のプロパティ */
  properties?: PropertyInfo[];
  /** ユニオン型の要素 */
  unionTypes?: TypeInfo[];
  /** 配列の要素型 */
  elementType?: TypeInfo;
}

/**
 * 型の種類
 */
export type TypeKind = 
  | 'primitive'     // string, number, boolean など
  | 'object'        // オブジェクト型
  | 'array'         // 配列型
  | 'union'         // ユニオン型
  | 'generic'       // ジェネリック型
  | 'promise'       // Promise型
  | 'result'        // Result型
  | 'unknown';      // 不明な型

/**
 * オブジェクト型のプロパティ情報
 */
export interface PropertyInfo {
  /** プロパティ名 */
  name: string;
  /** 型情報 */
  type: TypeInfo;
  /** オプショナルかどうか */
  optional: boolean;
  /** JSDoc コメント */
  documentation?: string;
}

/**
 * コード生成のターゲット
 */
export type GenerationTarget = 'main' | 'preload' | 'renderer';

/**
 * 生成されたコード
 */
export interface GeneratedCode {
  /** ターゲット */
  target: GenerationTarget;
  /** 生成されたコード */
  code: string;
  /** インポート文 */
  imports: string[];
  /** 型定義 */
  types: string[];
}