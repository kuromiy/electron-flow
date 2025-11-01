import { relative } from "node:path";
import type { PackageInfo } from "../parse.js";
import { createImportStatement } from "./utils.js";

export function formatRegister(
	packageInfos: PackageInfo[],
	outputPath: string,
	contextPath: string,
	customErrorHandler?: {
		path: string;
		functionName: string;
	},
) {
	const importStatements = createImportStatement(
		outputPath,
		packageInfos,
		(functionNames, importPath) => {
			return `import { ${functionNames} } from "${importPath}.js";`;
		},
	);

	const errorHandlerCode = customErrorHandler
		? `return ${customErrorHandler.functionName}(e);`
		: `return failure(e);`;

	const handlerStatements = packageInfos.flatMap((pkg) => {
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
