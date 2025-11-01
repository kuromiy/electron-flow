import type { PackageInfo } from "../parse.js";
import type { ZodObjectInfo } from "../zod.js";
import { createBodyStatement } from "./utils.js";

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
