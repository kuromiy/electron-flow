import { relative } from "node:path";
import type { PackageInfo } from "../parse.js";

export function createImportStatement(
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
