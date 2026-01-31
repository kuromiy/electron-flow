import { relative } from "node:path";
import type { PackageInfo } from "../parse/parseFile.js";
import { createImportStatement } from "./utils.js";

// 先頭を大文字にするヘルパー関数
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export function formatRendererIF(
	packages: PackageInfo[],
	outputPath: string,
	unwrapResults = false,
	customErrorHandler?: {
		path: string;
		functionName: string;
	},
) {
	// 個別エラーハンドラーを持つ関数を収集
	const functionsWithErrorHandler = packages.flatMap((pkg) =>
		pkg.func
			.filter((func) => func.errorHandlerName)
			.map((func) => ({
				funcName: func.name,
				errorHandlerName: func.errorHandlerName as string,
				importPath: pkg.path,
			})),
	);

	const importStatements = createImportStatement(
		outputPath,
		packages,
		(functionNames, importPath, pkg) => {
			// 個別エラーハンドラー名を収集（このパッケージに含まれるもの）
			const errorHandlerNames = pkg.func
				.filter((func) => func.errorHandlerName)
				.map((func) => func.errorHandlerName as string);
			const additionalTypeImports = errorHandlerNames.filter(
				(name, index, self) => self.indexOf(name) === index,
			);
			const allImports =
				additionalTypeImports.length > 0
					? `${functionNames}, ${additionalTypeImports.join(", ")}`
					: functionNames;
			return `import type { ${allImports} } from "${importPath}.js";`;
		},
	);

	const functions = packages.flatMap((pkg) => {
		return pkg.func.map((func) => {
			return {
				name: func.name,
				request: func.request,
				errorHandlerName: func.errorHandlerName,
			};
		});
	});

	// 関数ごとのエラー型を決定
	const getErrorTypeForFunction = (func: {
		name: string;
		errorHandlerName: string | undefined;
	}) => {
		if (func.errorHandlerName) {
			// 個別エラーハンドラーあり
			const individualType = `${capitalize(func.name)}ErrorType`;
			if (customErrorHandler) {
				// 個別 + グローバル → union型
				return `${individualType} | GlobalErrorType`;
			}
			// 個別のみ → union with unknown
			return `${individualType} | unknown`;
		}
		// 個別なし
		if (customErrorHandler) {
			return "GlobalErrorType";
		}
		return "unknown";
	};

	// インターフェース定義
	const interfaceLines = unwrapResults
		? functions.map((func) => {
				return `${func.name}: (${func.request.map((line) => `${line.name}: ${line.type}`).join(", ")}) => Promise<ReturnTypeUnwrapped<typeof ${func.name}>>`;
			})
		: functions.map((func) => {
				const errorType = getErrorTypeForFunction(func);
				return `${func.name}: (${func.request.map((line) => `${line.name}: ${line.type}`).join(", ")}) => Promise<Result<ReturnTypeUnwrapped<typeof ${func.name}>, ${errorType}>>`;
			});

	// window.api メソッドの型定義
	const windowApiMethods = functions.map((func) => {
		const errorType = getErrorTypeForFunction(func);
		return `${func.name}: (${func.request.map((req) => `${req.name}: ${req.type}`).join(", ")}) => Promise<Result<ReturnTypeUnwrapped<typeof ${func.name}>, ${errorType}>>`;
	});

	// 実装クラスのメソッド
	const implementationMethods = unwrapResults
		? functions.map((func) => {
				const params = func.request
					.map((req) => `${req.name}: ${req.type}`)
					.join(", ");
				const args = func.request.map((req) => req.name).join(", ");
				return `async ${func.name}(${params}) {
        const response = await window.api.${func.name}(${args});
        if (isFailure(response)) {
            throw response.value;
        }
        return response.value;
    }`;
			})
		: functions.map((func) => {
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

	// カスタムエラーハンドラーのimport文を生成
	const errorHandlerImport = customErrorHandler
		? (() => {
				const relativePath = relative(outputPath, customErrorHandler.path)
					.replace(/\\/g, "/")
					.replace(/\.ts$/, "");
				const finalPath = relativePath.startsWith(".")
					? relativePath
					: `./${relativePath}`;
				return `import type { ${customErrorHandler.functionName} } from "${finalPath}.js";\n`;
			})()
		: "";

	// Resultのimport（Failureは不要になった）
	const resultImport = hasFunctions
		? unwrapResults
			? 'import { isFailure, type Result } from "electron-flow/result";'
			: 'import type { Result } from "electron-flow";'
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
	const baseTypeUtilities = hasFunctions
		? `
// Promise を外す型ユーティリティ
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
// 関数型の戻り値を取得し、Promise を外す型ユーティリティ
type ReturnTypeUnwrapped<T> = T extends (...args: infer _Args) => infer R
    ? UnwrapPromise<R>
    : never;
`
		: "";

	// グローバルエラー型ユーティリティ（カスタムエラーハンドラーがある場合）
	const globalErrorTypeUtility =
		hasFunctions && customErrorHandler
			? `// グローバルエラーハンドラーの型（生の値を返す）
type GlobalErrorType = ReturnType<typeof ${customErrorHandler.functionName}>;
`
			: "";

	// 個別エラーハンドラーの型定義（エラーハンドラーを持つ関数ごとに生成）
	const individualErrorTypeDefinitions =
		hasFunctions && functionsWithErrorHandler.length > 0
			? `${functionsWithErrorHandler
					.map(
						({ funcName, errorHandlerName }) =>
							`type ${capitalize(funcName)}ErrorType = NonNullable<ReturnType<typeof ${errorHandlerName}>>;`,
					)
					.join("\n")}\n`
			: "";

	const typeUtilities =
		baseTypeUtilities + globalErrorTypeUtility + individualErrorTypeDefinitions;

	const interfaceDefinition = hasFunctions
		? `
// サービスインターフェース
export interface ServiceIF ${interfaceContent}
`
		: "";

	const text = `// auto generated
${importsSection}${errorHandlerImport}${resultImport}
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
