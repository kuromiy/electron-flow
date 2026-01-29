import { relative } from "node:path";
import type { EventPackageInfo } from "../parse/parseEventFile.js";

/**
 * イベント購読用のRenderer型定義とServiceクラスを生成する
 * @param packages - イベントパッケージ情報
 * @param outputPath - 出力先ディレクトリパス
 * @returns 生成されたコード文字列
 */
export function formatRendererEvents(
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

	// イベント一覧を生成
	const events = packages.flatMap((pkg) => pkg.events);

	// window.events の型定義
	const windowEventMethods = events.map((event) => {
		return `${event.name}: (cb: (value: ${event.paramTypeName}) => void) => () => void`;
	});

	// EventServiceIF インターフェースのメソッド
	const interfaceLines = events.map((event) => {
		return `${event.name}: (cb: (value: ${event.paramTypeName}) => void) => () => void`;
	});

	// EventService クラスのメソッド
	const implementationMethods = events.map((event) => {
		return `${event.name}(cb: (value: ${event.paramTypeName}) => void) {
        return window.events.${event.name}(cb);
    }`;
	});

	const hasEvents = events.length > 0;
	const importsSection =
		importStatements.length > 0 ? `${importStatements.join("\n")}\n` : "";

	const eventsContent =
		windowEventMethods.length > 0
			? `{\n            ${windowEventMethods.join(";\n            ")};\n        }`
			: "Record<string, never>";

	const interfaceContent =
		interfaceLines.length > 0
			? `{\n    ${interfaceLines.join(";\n    ")};\n}`
			: "";

	const classContent =
		implementationMethods.length > 0
			? `{\n    ${implementationMethods.join("\n\n    ")}\n}`
			: "";

	const interfaceDefinition = hasEvents
		? `
// イベント購読用インターフェース
export interface EventServiceIF ${interfaceContent}
`
		: "";

	const text = `// auto generated
${importsSection}
// window.events の型定義
declare global {
    interface Window {
        events: ${eventsContent};
    }
}
${interfaceDefinition}
// イベント購読用実装クラス
export class EventService${hasEvents ? ` implements EventServiceIF ${classContent}` : " {}"}
`;
	return text;
}
