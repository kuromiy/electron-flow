import { relative } from "node:path";
import type { PackageInfo } from "../parse.js";
import type { ZodObjectInfo } from "../zod.js";

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
