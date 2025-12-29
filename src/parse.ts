import { basename, dirname, extname, resolve } from "node:path";
import * as ts from "typescript";

type RequestInfo = {
	name: string;
	type: string;
};

type FuncInfo = {
	name: string;
	request: RequestInfo[];
};

export type PackageInfo = {
	path: string;
	func: FuncInfo[];
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
): { packages: PackageInfo[]; importedFiles: Set<string> } {
	const ignoreInfo = ignores.map((ignore) => {
		const [fileName, funcName] = ignore.split(".");
		return { fileName, funcName };
	});
	const importedFiles = new Set<string>();
	const program = ts.createProgram(paths, {});
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
						for (const prop of properties) {
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

				const pkg = packages.find((p) => p.path === path);
				if (pkg) {
					pkg.func.push({ name: node.name.getText(), request: params });
				} else {
					packages.push({
						path,
						func: [{ name: node.name.getText(), request: params }],
					});
				}
			}
		});
	}

	return { packages, importedFiles };
}
