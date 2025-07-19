// Phase 2以降で実装される関数のプレースホルダー

export interface AutoCodeOption {
  targetPath: string;
  ignores: string[];
  preloadPath: string;
  registerPath: string;
  rendererPath: string;
  contextPath?: string;
  errorHandler?: {
    handlerPath: string;
    handlerName: string;
    defaultHandler?: boolean;
  };
}

export interface ZodObjectInfo {
  name: string;
  path: string;
  fields: FieldInfo[];
  importPath: string;
}

export interface FieldInfo {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: unknown;
}

export interface PackageInfo {
  packageName: string;
  functions: FunctionInfo[];
}

export interface FunctionInfo {
  name: string;
  request: ParamInfo[];
  response: string;
  isAsync: boolean;
  filePath: string;
  importPath: string;
}

export interface ParamInfo {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
}

export interface BuildResult {
  zodObjectInfos: ZodObjectInfo[];
  packages: PackageInfo[];
}

/**
 * 一回限りのビルド実行
 * Phase 2で実装予定
 */
// eslint-disable-next-line no-unused-vars
export async function build(_option: AutoCodeOption): Promise<BuildResult> {
  throw new Error('Not implemented yet - will be implemented in Phase 2');
}

/**
 * ファイル監視付きビルド実行
 * Phase 6で実装予定
 */
// eslint-disable-next-line no-unused-vars
export async function watchBuild(_option: AutoCodeOption): Promise<void> {
  throw new Error('Not implemented yet - will be implemented in Phase 6');
}
