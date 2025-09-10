import { basename, extname } from "node:path";
import * as ts from "typescript";

type ZodObjectRelationRequest = {
	// z.infer<typeof xxxx>のxxxx
	src: string;
	// z.inferで生成される型名
	dist: string;
};

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
	relations: ZodObjectRelationRequest[];
};

export function parseFile(
	ignores: string[],
	paths: string[],
	packages: PackageInfo[] = [],
) {
	const ignoreInfo = ignores.map((ignore) => {
		const [fileName, funcName] = ignore.split(".");
		return { fileName, funcName };
	});
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
			// リクエストの型解析
			// 下記のようなコードを想定
			// export type XxxRequest = z.infer<typeof xxxSchema>;
			// compiler apiだと上記コードのようなz.inferで定義された型情報を正確に取得できない。
			// なので、別で解析したZodObjectInfoと照らし合わせて解析するためにリクエストの関係を保存する
			if (ts.isTypeAliasDeclaration(node) && node.name) {
				node.forEachChild((child) => {
					if (ts.isTypeReferenceNode(child)) {
						child.forEachChild((c) => {
							if (ts.isTypeQueryNode(c)) {
								c.forEachChild((cc) => {
									if (ts.isIdentifier(cc)) {
										const pkg = packages.find((p) => p.path === path);
										if (pkg) {
											pkg.relations.push({
												src: cc.getText(),
												dist: node.name.getText(),
											});
										} else {
											packages.push({
												path,
												func: [],
												relations: [
													{ src: cc.getText(), dist: node.name.getText() },
												],
											});
										}
									}
								});
							}
						});
					}
				});
			}

			// APIの解析
			// 下記のようなコードを想定
			// export async function xxx(ctx: Context, xxx: xxx) {}
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

				// パラメータの解析
				const params = [] as { name: string; type: string }[];
				signatures.forEach((signature) => {
					signature.parameters.forEach((param) => {
						// 一時変数に変数名→型の順で追加
						const temp = [] as string[];
						param.declarations?.forEach((declaration) => {
							declaration.forEachChild((child) => {
								temp.push(child.getText());
							});
						});
						// ここで変数と型のペアに変換
						for (let i = 0; i < temp.length; i += 2) {
							const name = temp[i];
							const type = temp[i + 1];
							// 値が存在しない場合はスキップ
							if (!name || !type) continue;
							// Contextは除外、ここで除外すべきかは要検討
							if (type === "Context") continue;
							params.push({ name, type });
						}
					});
				});

				const pkg = packages.find((p) => p.path === path);
				if (pkg) {
					pkg.func.push({ name: node.name.getText(), request: params });
				} else {
					packages.push({
						path,
						func: [{ name: node.name.getText(), request: params }],
						relations: [],
					});
				}
			}
		});
	}

	return packages;
}
