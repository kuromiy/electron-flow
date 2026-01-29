import { relative } from "node:path";
import type { PackageInfo } from "../parse/parseFile.js";
import { createImportStatement } from "./utils.js";

export function formatRendererIF(
	packages: PackageInfo[],
	outputPath: string,
	unwrapResults = false,
	customErrorHandler?: {
		path: string;
		functionName: string;
	},
) {
	const importStatements = createImportStatement(
		outputPath,
		packages,
		(functionNames, importPath) => {
			return `import type { ${functionNames} } from "${importPath}.js";`;
		},
	);

	const functions = packages.flatMap((pkg) => {
		return pkg.func.map((func) => {
			return { name: func.name, request: func.request };
		});
	});

	// エラー型の決定（customErrorHandlerがあればErrorType、なければunknown）
	const errorType = customErrorHandler ? "ErrorType" : "unknown";

	// インターフェース定義
	const interfaceLines = unwrapResults
		? functions.map((func) => {
				return `${func.name}: (${func.request.map((line) => `${line.name}: ${line.type}`).join(", ")}) => Promise<ReturnTypeUnwrapped<typeof ${func.name}>>`;
			})
		: functions.map((func) => {
				return `${func.name}: (${func.request.map((line) => `${line.name}: ${line.type}`).join(", ")}) => Promise<Result<ReturnTypeUnwrapped<typeof ${func.name}>, ${errorType}>>`;
			});

	// window.api メソッドの型定義
	const windowApiMethods = functions.map((func) => {
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

	const resultImport = hasFunctions
		? unwrapResults
			? customErrorHandler
				? 'import { isFailure, type Result, type Failure } from "electron-flow/result";'
				: 'import { isFailure, type Result } from "electron-flow/result";'
			: customErrorHandler
				? 'import type { Result, Failure } from "electron-flow";'
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

	// カスタムエラーハンドラーがある場合のエラー型ユーティリティ
	const errorTypeUtilities =
		hasFunctions && customErrorHandler
			? `// Failureからエラー型を抽出する型ユーティリティ
type ExtractFailureType<T> = T extends Failure<infer E> ? E : unknown;
type ErrorType = ExtractFailureType<ReturnType<typeof ${customErrorHandler.functionName}>>;
`
			: "";

	const typeUtilities = baseTypeUtilities + errorTypeUtilities;

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
