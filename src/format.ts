import { relative } from "node:path";
import type { PackageInfo } from "./parse.js";
import type { ZodObjectInfo } from "./zod.js";

export function formatPreload(
	zodObjectInfos: ZodObjectInfo[],
	packages: PackageInfo[],
) {
	const lines = createBodyStatement(packages, zodObjectInfos, (functions) => {
		return functions.map((func) => {
			return `${func.name}: (${func.request.map((req) => `${req.name}: ${req.type}`).join(", ")}) => ipcRenderer.invoke("${func.name}", { ${func.request.map((req) => req.name).join(", ")} })`;
		});
	});

	// 空配列の場合でも有効なコードを生成
	const exportContent =
		lines.length > 0 ? `{\n    ${lines.join(",\n    ")}\n}` : "{}";

	const text = `// auto generated
import { ipcRenderer } from "electron";

export default ${exportContent};
`;
	return text;
}

export function formatRegister(
	packgaeInfos: PackageInfo[],
	outputPath: string,
	contextPath: string,
	customErrorHandler?: {
		path: string;
		functionName: string;
	},
) {
	const importStatements = createImportStatement(
		outputPath,
		packgaeInfos,
		(functionNames, importPath) => {
			return `import { ${functionNames} } from "${importPath}.js";`;
		},
	);

	const errorHandlerCode = customErrorHandler
		? `return ${customErrorHandler.functionName}(e);`
		: `return failure(e);`;

	const handlerStatements = packgaeInfos.flatMap((pkg) => {
		return pkg.func.map((func) => {
			const argsParam = func.request.length > 0 ? "args: any" : "_: unknown";
			return `"${func.name}": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, ${argsParam}) => {
            try {
                const result = await ${func.name}({ ...ctx, event }, ${func.request.length > 0 ? `args` : ``});
                return success(result);
            } catch (e) {
                ${errorHandlerCode}
            }
        };
    },`;
		});
	});

	const contextImportPath = relative(outputPath, contextPath)
		.replace(/\/|\\/g, "/")
		.replace(/\.[^/.]+$/, "");

	const customErrorImport = customErrorHandler
		? (() => {
				const importPath = relative(outputPath, customErrorHandler.path)
					.replace(/\/|\\/g, "/")
					.replace(/\.[^/.]+$/, "");
				// 相対パスが..で始まらない場合は./を追加
				const finalPath = importPath.startsWith(".")
					? importPath
					: `./${importPath}`;
				return `\nimport { ${customErrorHandler.functionName} } from "${finalPath}.js";`;
			})()
		: "";

	// 空配列の場合でも有効なコードを生成
	const hasHandlers = handlerStatements.length > 0;
	const handlersContent = hasHandlers
		? `{\n    ${handlerStatements.join("\n    ")}\n}`
		: "{}";

	const importsSection =
		importStatements.length > 0 ? `\n${importStatements.join("\n")}\n` : "";

	// ハンドラーがある場合のみ必要なimportを含める
	const electronFlowImports =
		hasHandlers || customErrorHandler
			? '\nimport { success, failure } from "electron-flow";'
			: "";

	const ipcMainImports = hasHandlers
		? 'import { ipcMain, type IpcMainInvokeEvent } from "electron";'
		: 'import { ipcMain } from "electron";';

	// ハンドラーがある場合とない場合で異なる実装を生成
	const registerFunction = hasHandlers
		? `export function registerAutoGenerateAPI(ctx: Omit<Context, "event">) {
    Object.entries(autoGenerateHandlers).forEach(([key, value]) => {
        ipcMain.handle(key, value(ctx));
    });
}`
		: `export function registerAutoGenerateAPI(ctx: Omit<Context, "event">) {
    // No handlers to register
}`;

	const removeFunction = hasHandlers
		? `export function removeAutoGenerateAPI() {
    Object.keys(autoGenerateHandlers).forEach(key => {
        ipcMain.removeHandler(key);
    });
}`
		: `export function removeAutoGenerateAPI() {
    // No handlers to remove
}`;

	const text = `// auto generated
import type { Context } from "${contextImportPath}.js";
${ipcMainImports}${electronFlowImports}${customErrorImport}
${importsSection}
export const autoGenerateHandlers = ${handlersContent};

${registerFunction}

${removeFunction}
`;
	return text;
}

export function formatRendererIF(
	packages: PackageInfo[],
	zodObjectInfos: ZodObjectInfo[],
	outputPath: string,
) {
	const importStatements = createImportStatement(
		outputPath,
		packages,
		(functionNames, importPath) => {
			return `import type { ${functionNames} } from "${importPath}.js";`;
		},
	);

	const functions = packages.flatMap((pkg) => {
		return pkg.func.flatMap((func) => {
			const requests = func.request.reduce(
				(prev, curr) => {
					const foundRel = pkg.relations.find((r) => r.dist === curr.type);
					if (foundRel) {
						const found = zodObjectInfos.find((z) => z.name === foundRel.src);
						if (found) {
							const temp = found.fields.map((field) => {
								return { name: field.name, type: field.type };
							});
							return prev.concat(temp);
						}
					}
					return prev.concat({ name: curr.name, type: curr.type });
				},
				[] as { name: string; type: string }[],
			);
			return { name: func.name, request: requests };
		});
	});

	// インターフェース定義
	const interfaceLines = functions.map((func) => {
		return `${func.name}: (${func.request.map((line) => `${line.name}: ${line.type}`).join(", ")}) => Promise<Result<ReturnTypeUnwrapped<typeof ${func.name}>, Error>>`;
	});

	// window.api メソッドの型定義
	const windowApiMethods = functions.map((func) => {
		return `${func.name}: (${func.request.map((req) => `${req.name}: ${req.type}`).join(", ")}) => Promise<Result<ReturnTypeUnwrapped<typeof ${func.name}>, Error>>`;
	});

	// 実装クラスのメソッド
	const implementationMethods = functions.map((func) => {
		const params = func.request
			.map((req) => `${req.name}: ${req.type}`)
			.join(", ");
		const args = func.request.map((req) => req.name).join(", ");
		return `async ${func.name}(${params}) {
        return window.api.${func.name}(${args});
    }`;
	});

	// 空配列の場合でも有効なコードを生成
	const hasFunctions = functions.length > 0;
	const importsSection =
		importStatements.length > 0 ? `${importStatements.join("\n")}\n` : "";

	const resultImport = hasFunctions
		? 'import type { Result } from "electron-flow";'
		: "";

	const apiContent =
		windowApiMethods.length > 0
			? `{\n            ${windowApiMethods.join(";\n            ")};\n        }`
			: "Record<string, never>";

	const interfaceContent =
		interfaceLines.length > 0
			? `{\n    ${interfaceLines.join(";\n    ")};\n}`
			: "";

	const classContent =
		implementationMethods.length > 0
			? `{\n    ${implementationMethods.join("\n\n    ")}\n}`
			: "";

	// 型ユーティリティは関数がある場合のみ生成
	const typeUtilities = hasFunctions
		? `
// Promise を外す型ユーティリティ
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
// 関数型の戻り値を取得し、Promise を外す型ユーティリティ
type ReturnTypeUnwrapped<T> = T extends (...args: unknown[]) => infer R
    ? UnwrapPromise<R>
    : never;
`
		: "";

	const interfaceDefinition = hasFunctions
		? `
// サービスインターフェース
export interface ServiceIF ${interfaceContent}
`
		: "";

	const text = `// auto generated
${importsSection}${resultImport}
${typeUtilities}
// window.api の型定義
declare global {
    interface Window {
        api: ${apiContent};
    }
}
${interfaceDefinition}
// サービス実装クラス
export class ApiService${hasFunctions ? ` implements ServiceIF ${classContent}` : " {}"}
`;
	return text;
}

function createImportStatement(
	outputPath: string,
	packages: PackageInfo[],
	apply: (functionNames: string, importPath: string) => string,
) {
	return packages.map((pkg) => {
		const functionNames = pkg.func.map((func) => func.name).join(", ");
		const importPath = relative(outputPath, pkg.path)
			.replace(/\/|\\/g, "/")
			.replace(/\.[^/.]+$/, "");
		return apply(functionNames, importPath);
	});
}

function createBodyStatement(
	packgaes: PackageInfo[],
	zodObjectInfos: ZodObjectInfo[],
	apply: (
		functions: { name: string; request: { name: string; type: string }[] }[],
	) => string[],
) {
	const functions = packgaes.flatMap((pkg) => {
		return pkg.func.flatMap((func) => {
			const requests = func.request.reduce(
				(prev, curr) => {
					const foundRel = pkg.relations.find((r) => r.dist === curr.type);
					if (foundRel) {
						const found = zodObjectInfos.find((z) => z.name === foundRel.src);
						if (found) {
							// 基本的に処理はここに来るはず
							// compiler apiで解析した型名に紐づいたZodObjectInfoから正しい型情報を展開する
							const temp = found.fields.map((field) => {
								return { name: field.name, type: field.type };
							});
							return prev.concat(temp);
						}
					}
					// 来ないはず。。。例外投げるべきかも
					// console.log("!!!! WARNING !!!!", curr.type);
					// console.log(pkg.relations);
					// console.log(zodObjectInfos);
					return prev.concat({ name: curr.name, type: curr.type });
				},
				[] as { name: string; type: string }[],
			);
			return { name: func.name, request: requests };
		});
	});
	return apply(functions);
}
