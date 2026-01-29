import { basename, dirname, extname } from "node:path";
import * as ts from "typescript";
import {
	createErrorHandlerName,
	createValidatorName,
} from "../format/utils.js";

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

export function parseFile(
	ignores: string[],
	paths: string[],
	packages: PackageInfo[] = [],
	validatorPattern?: string,
	errorHandlerPattern?: string,
): { packages: PackageInfo[] } {
	const ignoreInfo = ignores.map((ignore) => {
		const [fileName, funcName] = ignore.split(".");
		return { fileName, funcName };
	});

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

	return { packages };
}
