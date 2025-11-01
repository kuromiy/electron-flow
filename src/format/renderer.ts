import type { PackageInfo } from "../parse.js";
import type { ZodObjectInfo } from "../zod.js";
import { createImportStatement } from "./utils.js";

export function formatRendererIF(
	packages: PackageInfo[],
	zodObjectInfos: ZodObjectInfo[],
	outputPath: string,
	unwrapResults = false,
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
	const interfaceLines = unwrapResults
		? functions.map((func) => {
				return `${func.name}: (${func.request.map((line) => `${line.name}: ${line.type}`).join(", ")}) => Promise<ReturnTypeUnwrapped<typeof ${func.name}>>`;
			})
		: functions.map((func) => {
				return `${func.name}: (${func.request.map((line) => `${line.name}: ${line.type}`).join(", ")}) => Promise<Result<ReturnTypeUnwrapped<typeof ${func.name}>, Error>>`;
			});

	// window.api メソッドの型定義
	const windowApiMethods = functions.map((func) => {
		return `${func.name}: (${func.request.map((req) => `${req.name}: ${req.type}`).join(", ")}) => Promise<Result<ReturnTypeUnwrapped<typeof ${func.name}>, Error>>`;
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
	const typeUtilities = hasFunctions
		? `
// Promise を外す型ユーティリティ
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
// 関数型の戻り値を取得し、Promise を外す型ユーティリティ
type ReturnTypeUnwrapped<T> = T extends (...args: infer _Args) => infer R
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
