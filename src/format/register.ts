import { relative } from "node:path";
import type { PackageInfo } from "../parse/parseFile.js";
import { createImportStatement } from "./utils.js";

export interface ValidatorConfig {
	/**
	 * バリデーター名のパターン
	 * {funcName} - 関数名そのまま (registerAuthor)
	 * {FuncName} - PascalCase (RegisterAuthor)
	 * @default "{funcName}Validator"
	 */
	pattern?: string;
}

export interface ErrorHandlerConfig {
	/**
	 * エラーハンドラー名のパターン
	 * {funcName} - 関数名そのまま (registerAuthor)
	 * {FuncName} - PascalCase (RegisterAuthor)
	 * @default "{funcName}ErrorHandler"
	 */
	pattern?: string;
	/**
	 * エラーハンドラーが失敗した場合にconsole.warnを出力するかどうか
	 * @default false
	 */
	debug?: boolean;
}

export function formatHandlers(
	packageInfos: PackageInfo[],
	outputPath: string,
	contextPath: string,
	customErrorHandler?: {
		path: string;
		functionName: string;
		debug?: boolean;
	},
	_validatorConfig?: ValidatorConfig,
	errorHandlerConfig?: ErrorHandlerConfig,
) {
	const importStatements = createImportStatement(
		outputPath,
		packageInfos,
		(functionNames, importPath, pkg) => {
			// バリデーター名を収集（validatorNameが設定されている関数のみ）
			const validatorNames = pkg.func
				.filter((func) => func.validatorName)
				.map((func) => func.validatorName as string);
			// 個別エラーハンドラー名を収集（errorHandlerNameが設定されている関数のみ）
			const errorHandlerNames = pkg.func
				.filter((func) => func.errorHandlerName)
				.map((func) => func.errorHandlerName as string);
			const additionalImports = [
				...validatorNames,
				...errorHandlerNames,
			].filter((name, index, self) => self.indexOf(name) === index); // 重複除去
			const allImports =
				additionalImports.length > 0
					? `${functionNames}, ${additionalImports.join(", ")}`
					: functionNames;
			return `import { ${allImports} } from "${importPath}.js";`;
		},
	);

	// debugオプションの決定（customErrorHandlerまたはerrorHandlerConfigのdebugがtrueならtrue）
	const debug = customErrorHandler?.debug || errorHandlerConfig?.debug || false;

	/**
	 * エラーハンドリングコードを生成
	 * 優先順位:
	 * 1. 個別エラーハンドラー（errorHandlerName）がある場合
	 *    - nullを返した場合はグローバルへフォールバック
	 * 2. グローバルエラーハンドラー（customErrorHandler）がある場合
	 * 3. どちらもなければ failure(e) を返す
	 *
	 * すべてのエラーハンドラーはtry-catchで囲み、ハンドラーがエラーを投げた場合はfailure(e)を返す
	 * カスタムエラーハンドラーは生の値を返すので、failure()でラップする
	 */
	const generateErrorHandlerCode = (errorHandlerName?: string): string => {
		const warnCode = debug
			? `console.warn("[electron-flow] Error handler threw an error:", handlerError);
                    `
			: "";

		if (errorHandlerName) {
			// 個別エラーハンドラーがある場合
			if (customErrorHandler) {
				// 個別 + グローバル両方ある場合
				return `try {
                    const individualResult = ${errorHandlerName}(e, { ...ctx, event });
                    if (individualResult !== null) {
                        return failure(individualResult);
                    }
                    return failure(${customErrorHandler.functionName}(e, { ...ctx, event }));
                } catch (handlerError) {
                    ${warnCode}return failure(e);
                }`;
			}
			// 個別のみ（グローバルなし）
			return `try {
                    const individualResult = ${errorHandlerName}(e, { ...ctx, event });
                    if (individualResult !== null) {
                        return failure(individualResult);
                    }
                    return failure(e);
                } catch (handlerError) {
                    ${warnCode}return failure(e);
                }`;
		}
		// グローバルのみまたはどちらもなし
		if (customErrorHandler) {
			return `try {
                    return failure(${customErrorHandler.functionName}(e, { ...ctx, event }));
                } catch (handlerError) {
                    ${warnCode}return failure(e);
                }`;
		}
		return `return failure(e);`;
	};

	const handlerStatements = packageInfos.flatMap((pkg) => {
		return pkg.func.map((func) => {
			const hasArgs = func.request.length > 0;
			const hasValidator = func.validatorName !== undefined;
			const argsParam = hasArgs
				? hasValidator
					? "args: unknown"
					: "args: any"
				: "_: unknown";

			const errorHandlerCode = generateErrorHandlerCode(func.errorHandlerName);

			// バリデーター関数がある場合のみバリデーションコードを生成
			if (hasArgs && hasValidator) {
				return `"${func.name}": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, ${argsParam}) => {
            try {
                const validatedArgs = ${func.validatorName}(args, { ...ctx, event });
                const result = await ${func.name}({ ...ctx, event }, validatedArgs);
                return success(result);
            } catch (e) {
                ${errorHandlerCode}
            }
        };
    },`;
			}
			if (hasArgs) {
				return `"${func.name}": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, ${argsParam}) => {
            try {
                const result = await ${func.name}({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                ${errorHandlerCode}
            }
        };
    },`;
			}
			return `"${func.name}": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, ${argsParam}) => {
            try {
                const result = await ${func.name}({ ...ctx, event });
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
	// 個別エラーハンドラーがある場合もfailureが必要
	const hasIndividualErrorHandler = packageInfos.some((pkg) =>
		pkg.func.some((func) => func.errorHandlerName),
	);
	const electronFlowImports =
		hasHandlers || customErrorHandler || hasIndividualErrorHandler
			? '\nimport { success, failure } from "electron-flow";'
			: "";

	const text = `// auto generated
import type { Context } from "${contextImportPath}.js";
import type { IpcMainInvokeEvent } from "electron";${electronFlowImports}${customErrorImport}
${importsSection}
export const autoGenerateHandlers = ${handlersContent};
`;
	return text;
}

export function formatRegisterAPI(
	packageInfos: PackageInfo[],
	outputPath: string,
	contextPath: string,
) {
	const contextImportPath = relative(outputPath, contextPath)
		.replace(/\/|\\/g, "/")
		.replace(/\.[^/.]+$/, "");

	const hasHandlers = packageInfos.some((pkg) => pkg.func.length > 0);

	// ハンドラーがある場合とない場合で異なる実装を生成
	const registerFunction = hasHandlers
		? `export function registerAutoGenerateAPI(ctx: Omit<Context, "event">) {
    Object.entries(autoGenerateHandlers).forEach(([key, value]) => {
        ipcMain.handle(key, value(ctx));
    });
}`
		: `export function registerAutoGenerateAPI(_ctx: Omit<Context, "event">) {
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

	const handlersImport = hasHandlers
		? 'import { autoGenerateHandlers } from "./handlers.js";'
		: "";

	const ipcMainImport = hasHandlers
		? 'import { ipcMain } from "electron";'
		: "";

	const text = `// auto generated
import type { Context } from "${contextImportPath}.js";
${ipcMainImport}
${handlersImport}

${registerFunction}

${removeFunction}
`;
	return text;
}
