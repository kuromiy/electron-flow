import { relative } from "node:path";
import type { PackageInfo } from "../parse.js";

export function createImportStatement(
	outputPath: string,
	packages: PackageInfo[],
	apply: (
		functionNames: string,
		importPath: string,
		pkg: PackageInfo,
	) => string,
) {
	return packages.map((pkg) => {
		const functionNames = pkg.func.map((func) => func.name).join(", ");
		const importPath = relative(outputPath, pkg.path)
			.replace(/\/|\\/g, "/")
			.replace(/\.[^/.]+$/, "");
		return apply(functionNames, importPath, pkg);
	});
}

/**
 * バリデーター名を生成する
 * @param funcName 関数名
 * @param pattern パターン文字列 ({funcName}, {FuncName} をサポート)
 * @returns バリデーター名
 */
export function createValidatorName(funcName: string, pattern: string): string {
	const pascalCase = funcName.charAt(0).toUpperCase() + funcName.slice(1);
	return pattern
		.replaceAll("{funcName}", funcName)
		.replaceAll("{FuncName}", pascalCase);
}

export function createBodyStatement(
	packages: PackageInfo[],
	apply: (
		functions: { name: string; request: { name: string; type: string }[] }[],
	) => string[],
) {
	const functions = packages.flatMap((pkg) => {
		return pkg.func.map((func) => {
			return { name: func.name, request: func.request };
		});
	});
	return apply(functions);
}
