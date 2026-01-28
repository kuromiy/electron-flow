import { basename, dirname, extname, resolve } from "node:path";
import * as ts from "typescript";
import { createErrorHandlerName, createValidatorName } from "./format/utils.js";

type RequestInfo = {
	name: string;
	type: string;
};

type FuncInfo = {
	name: string;
	request: RequestInfo[];
	/** バリデーター関数名（存在する場合のみ設定） */
	validatorName?: string;
	/** 個別エラーハンドラー関数名（存在する場合のみ設定） */
	errorHandlerName?: string;
};

export type PackageInfo = {
	path: string;
	func: FuncInfo[];
};

/**
 * イベント定義の情報
 * 例: export type onSuccess = (value: SuccessMessage) => void;
 */
export type EventInfo = {
	/** イベント名（例: onSuccess） */
	name: string;
	/** 引数の型名（例: SuccessMessage） */
	paramTypeName: string;
};

/**
 * イベントパッケージ情報
 */
export type EventPackageInfo = {
	/** ファイルパス */
	path: string;
	/** イベント定義リスト */
	events: EventInfo[];
};

/**
 * import文の相対パスを絶対パスに解決する
 * @param currentFilePath - 現在のファイルのディレクトリパス
 * @param importPath - import文で指定された相対パス（例: "../schemas/user-schema.js"）
 * @returns 解決された絶対パス
 */
function resolveImportPath(
	currentFilePath: string,
	importPath: string,
): string {
	// .js拡張子を.tsに変換（ランタイムではなくソースコードを解析するため）
	const tsImportPath = importPath.replace(/\.js$/, ".ts");
	// 絶対パスに解決
	return resolve(currentFilePath, tsImportPath);
}

export function parseFile(
	ignores: string[],
	paths: string[],
	packages: PackageInfo[] = [],
	validatorPattern?: string,
	errorHandlerPattern?: string,
): { packages: PackageInfo[]; importedFiles: Set<string> } {
	const ignoreInfo = ignores.map((ignore) => {
		const [fileName, funcName] = ignore.split(".");
		return { fileName, funcName };
	});
	const importedFiles = new Set<string>();

	// 入力ファイルのディレクトリからtsconfig.jsonを探す
	let compilerOptions: ts.CompilerOptions = {};
	if (paths.length > 0) {
		const firstFilePath = paths[0];
		if (firstFilePath) {
			const configPath = ts.findConfigFile(
				dirname(firstFilePath),
				ts.sys.fileExists,
				"tsconfig.json",
			);
			if (configPath) {
				const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
				if (configFile.config) {
					const parsedConfig = ts.parseJsonConfigFileContent(
						configFile.config,
						ts.sys,
						dirname(configPath),
					);
					compilerOptions = parsedConfig.options;
				}
			}
		}
	}

	const program = ts.createProgram(paths, compilerOptions);
	const checker = program.getTypeChecker();

	for (const path of paths) {
		const sourceFile = program.getSourceFile(path);
		if (!sourceFile) {
			console.log(`Source file not found: ${path}`);
			continue;
		}

		const fileWithOutExt = basename(path, extname(path));
		const ignoreFuncName = ignoreInfo
			.filter((info) => info.fileName === fileWithOutExt)
			.map((info) => info.funcName);

		// 1パス目: エクスポートされた関数名を収集（バリデーター・エラーハンドラー検出用）
		const exportedFunctions = new Set<string>();
		if (validatorPattern || errorHandlerPattern) {
			ts.forEachChild(sourceFile, (node) => {
				// 関数宣言の場合
				if (ts.isFunctionDeclaration(node) && node.name) {
					const modifierFlags = ts.getCombinedModifierFlags(node);
					const isExported = (modifierFlags & ts.ModifierFlags.Export) !== 0;
					if (isExported) {
						exportedFunctions.add(node.name.getText());
					}
				}
				// 変数宣言の場合（export const validator = zodValidator(...) など）
				if (ts.isVariableStatement(node)) {
					const hasExportModifier = node.modifiers?.some(
						(mod) => mod.kind === ts.SyntaxKind.ExportKeyword,
					);
					if (hasExportModifier) {
						for (const declaration of node.declarationList.declarations) {
							if (ts.isIdentifier(declaration.name)) {
								exportedFunctions.add(declaration.name.getText());
							}
						}
					}
				}
			});
		}

		ts.forEachChild(sourceFile, (node) => {
			// import文の解析
			// 他のファイルからインポートされているファイルを収集
			if (ts.isImportDeclaration(node)) {
				const moduleSpecifier = node.moduleSpecifier;
				if (ts.isStringLiteral(moduleSpecifier)) {
					const importPath = moduleSpecifier.text;
					// 相対パスの場合のみ処理（node_modulesなどは除外）
					if (importPath.startsWith("./") || importPath.startsWith("../")) {
						const currentDir = dirname(path);
						const resolvedPath = resolveImportPath(currentDir, importPath);
						importedFiles.add(resolvedPath);
					}
				}
			}

			// APIの解析
			// 下記のようなコードを想定
			// export async function xxx(ctx: Context, req: SomeRequest) {}
			// exportされているかつ第一引数がContextの関数を対象に解析
			if (ts.isFunctionDeclaration(node) && node.name) {
				// exportされている関数のみ解析
				const modifierFlags = ts.getCombinedModifierFlags(node);
				const isExported = (modifierFlags & ts.ModifierFlags.Export) !== 0;
				if (!isExported) return;

				const type = checker.getTypeAtLocation(node);
				const signatures = type.getCallSignatures();

				// 第一引数がContextの関数のみ解析
				if (signatures.length === 0) return;
				const signature = signatures[0];
				if (!signature) return;
				const firstParam = signature.parameters?.[0];
				if (!firstParam) return;

				const valueDeclaration = firstParam.valueDeclaration;
				if (!valueDeclaration) return;

				const firstParamType = checker.getTypeOfSymbolAtLocation(
					firstParam,
					valueDeclaration,
				);
				const firstParamTypeString = checker.typeToString(firstParamType);
				if (firstParamTypeString !== "Context") return;

				// 除外関数の場合はスキップ
				if (ignoreFuncName.includes(node.name.getText())) return;

				// 第2引数以降のパラメータを解析
				// Type Checkerを使って型を直接展開する
				const params: RequestInfo[] = [];
				for (let i = 1; i < signature.parameters.length; i++) {
					const param = signature.parameters[i];
					if (!param) continue;

					const paramDecl = param.valueDeclaration;
					if (!paramDecl) continue;

					const paramType = checker.getTypeOfSymbolAtLocation(param, paramDecl);

					// オブジェクト型の場合はフィールドを展開
					const properties = paramType.getProperties();
					if (properties.length > 0) {
						// プロパティをソースコード上の宣言位置でソート
						const sortedProperties = [...properties].sort((a, b) => {
							const aDecl = a.valueDeclaration ?? a.declarations?.[0];
							const bDecl = b.valueDeclaration ?? b.declarations?.[0];
							if (!aDecl || !bDecl) return 0;
							// 同じファイル内の場合は位置でソート
							if (aDecl.getSourceFile() === bDecl.getSourceFile()) {
								return aDecl.getStart() - bDecl.getStart();
							}
							return 0;
						});
						for (const prop of sortedProperties) {
							const propDecl = prop.valueDeclaration ?? prop.declarations?.[0];
							if (!propDecl) continue;

							const propType = checker.getTypeOfSymbolAtLocation(
								prop,
								propDecl,
							);
							let propTypeString = checker.typeToString(
								propType,
								undefined,
								ts.TypeFormatFlags.NoTruncation,
							);

							// オプショナルプロパティの場合は | undefined を追加
							const isOptional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
							if (isOptional && !propTypeString.includes("undefined")) {
								propTypeString = `${propTypeString} | undefined`;
							}

							params.push({
								name: prop.name,
								type: propTypeString,
							});
						}
					} else {
						// プリミティブ型などの場合はそのまま追加
						const paramTypeString = checker.typeToString(
							paramType,
							undefined,
							ts.TypeFormatFlags.NoTruncation,
						);
						params.push({
							name: param.name,
							type: paramTypeString,
						});
					}
				}

				// バリデーター関数の存在を確認
				const funcName = node.name.getText();
				let validatorName: string | undefined;
				if (validatorPattern) {
					const expectedValidatorName = createValidatorName(
						funcName,
						validatorPattern,
					);
					if (exportedFunctions.has(expectedValidatorName)) {
						validatorName = expectedValidatorName;
					}
				}

				// 個別エラーハンドラー関数の存在を確認
				let errorHandlerName: string | undefined;
				if (errorHandlerPattern) {
					const expectedErrorHandlerName = createErrorHandlerName(
						funcName,
						errorHandlerPattern,
					);
					if (exportedFunctions.has(expectedErrorHandlerName)) {
						errorHandlerName = expectedErrorHandlerName;
					}
				}

				const funcInfo: FuncInfo = {
					name: funcName,
					request: params,
					...(validatorName && { validatorName }),
					...(errorHandlerName && { errorHandlerName }),
				};

				const pkg = packages.find((p) => p.path === path);
				if (pkg) {
					pkg.func.push(funcInfo);
				} else {
					packages.push({
						path,
						func: [funcInfo],
					});
				}
			}
		});
	}

	return { packages, importedFiles };
}

/**
 * イベント定義ファイルをパースする
 * 関数型エイリアス（type Foo = (arg: T) => void）を解析する
 * @param paths - パースするファイルパスのリスト
 * @returns イベントパッケージ情報のリスト
 */
export function parseEventFile(paths: string[]): {
	packages: EventPackageInfo[];
} {
	const packages: EventPackageInfo[] = [];

	// 入力ファイルのディレクトリからtsconfig.jsonを探す
	let compilerOptions: ts.CompilerOptions = {};
	if (paths.length > 0) {
		const firstFilePath = paths[0];
		if (firstFilePath) {
			const configPath = ts.findConfigFile(
				dirname(firstFilePath),
				ts.sys.fileExists,
				"tsconfig.json",
			);
			if (configPath) {
				const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
				if (configFile.config) {
					const parsedConfig = ts.parseJsonConfigFileContent(
						configFile.config,
						ts.sys,
						dirname(configPath),
					);
					compilerOptions = parsedConfig.options;
				}
			}
		}
	}

	const program = ts.createProgram(paths, compilerOptions);

	for (const path of paths) {
		const sourceFile = program.getSourceFile(path);
		if (!sourceFile) {
			console.log(`Source file not found: ${path}`);
			continue;
		}

		const events: EventInfo[] = [];

		ts.forEachChild(sourceFile, (node) => {
			// 型エイリアス宣言を解析
			// 例: export type onSuccess = (value: SuccessMessage) => void;
			if (ts.isTypeAliasDeclaration(node)) {
				// exportされている型のみ解析
				const modifierFlags = ts.getCombinedModifierFlags(node);
				const isExported = (modifierFlags & ts.ModifierFlags.Export) !== 0;
				if (!isExported) return;

				const typeName = node.name.getText(sourceFile);

				// 関数型かどうかを確認（ASTレベルで）
				const typeNode = node.type;
				if (!ts.isFunctionTypeNode(typeNode)) return;

				// 戻り値がvoidであることを確認
				const returnTypeNode = typeNode.type;
				if (
					!ts.isTypeReferenceNode(returnTypeNode) &&
					returnTypeNode.kind !== ts.SyntaxKind.VoidKeyword
				) {
					return;
				}
				if (returnTypeNode.kind !== ts.SyntaxKind.VoidKeyword) return;

				// 引数が1つであることを確認
				const parameters = typeNode.parameters;
				if (parameters.length !== 1) return;

				const param = parameters[0];
				if (!param) return;

				// 引数の型名を取得
				const paramTypeNode = param.type;
				if (!paramTypeNode) return;

				// 型参照ノードから型名を取得
				if (!ts.isTypeReferenceNode(paramTypeNode)) return;

				const paramTypeName = paramTypeNode.typeName.getText(sourceFile);

				events.push({
					name: typeName,
					paramTypeName,
				});
			}
		});

		if (events.length > 0) {
			packages.push({
				path,
				events,
			});
		}
	}

	return { packages };
}
