import { relative } from "node:path";
import type { EventPackageInfo } from "../parse.js";

/**
 * EventSenderクラスを生成する
 * @param packages - イベントパッケージ情報
 * @param outputPath - 出力先ディレクトリパス
 * @returns 生成されたコード文字列
 */
export function formatEventSender(
	packages: EventPackageInfo[],
	outputPath: string,
) {
	// インポート文を生成
	const importStatements = packages.map((pkg) => {
		const typeNames = pkg.events.map((event) => event.paramTypeName).join(", ");
		const importPath = relative(outputPath, pkg.path)
			.replace(/\/|\\/g, "/")
			.replace(/\.[^/.]+$/, "");
		// 相対パスが..で始まらない場合は./を追加
		const finalPath = importPath.startsWith(".")
			? importPath
			: `./${importPath}`;
		return `import type { ${typeNames} } from "${finalPath}.js";`;
	});

	// EventSenderのメソッドを生成
	const methods = packages.flatMap((pkg) => {
		return pkg.events.map((event) => {
			return `${event.name}(value: ${event.paramTypeName}) {
        this.sender.send("${event.name}", value);
    }`;
		});
	});

	const hasEvents = methods.length > 0;

	const importsSection =
		importStatements.length > 0 ? `${importStatements.join("\n")}\n` : "";

	const classContent = hasEvents
		? `{
    constructor(private sender: WebContents) {}

    ${methods.join("\n\n    ")}
}`
		: `{
    constructor(private sender: WebContents) {}
}`;

	const text = `// auto generated
import type { WebContents } from "electron";
${importsSection}
/**
 * 型安全なイベント送信クラス
 * Contextに組み込んで使用する
 */
export class EventSender ${classContent}

/**
 * EventSenderのファクトリ関数
 */
export function createEventSender(sender: WebContents): EventSender {
    return new EventSender(sender);
}
`;
	return text;
}
