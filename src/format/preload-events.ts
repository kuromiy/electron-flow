import { relative } from "node:path";
import type { EventPackageInfo } from "../parse.js";

/**
 * イベント購読用のpreloadコードを生成する
 * @param packages - イベントパッケージ情報
 * @param outputPath - 出力先ディレクトリパス
 * @returns 生成されたコード文字列
 */
export function formatPreloadEvents(
	packages: EventPackageInfo[],
	outputPath: string,
) {
	// インポート文を生成
	const importStatements = packages.map((pkg) => {
		const typeNames = pkg.events.map((event) => event.paramTypeName).join(", ");
		const importPath = relative(outputPath, pkg.path)
			.replace(/\/|\\/g, "/")
			.replace(/\.[^/.]+$/, "");
		return `import type { ${typeNames} } from "${importPath}.js";`;
	});

	// イベントハンドラを生成
	const eventHandlers = packages.flatMap((pkg) => {
		return pkg.events.map((event) => {
			return `${event.name}: (cb: (value: ${event.paramTypeName}) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, value: ${event.paramTypeName}) => {
            cb(value);
        };
        ipcRenderer.on("${event.name}", handler);
        return () => {
            ipcRenderer.removeListener("${event.name}", handler);
        };
    }`;
		});
	});

	// 空配列の場合でも有効なコードを生成
	const exportContent =
		eventHandlers.length > 0
			? `{\n    ${eventHandlers.join(",\n    ")}\n}`
			: "{}";

	const importsSection =
		importStatements.length > 0 ? `\n${importStatements.join("\n")}\n` : "";

	const text = `// auto generated
import { ipcRenderer } from "electron";
${importsSection}
export default ${exportContent};
`;
	return text;
}
