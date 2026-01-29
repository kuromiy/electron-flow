import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ErrorTestCase } from "../../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: ErrorTestCase = {
	name: "存在しないeventDirPathで警告ログ出力、イベント生成スキップ",
	options: {
		eventDirPath: "./non-existent-event-path",
		preloadEventsPath: join(
			__dirname,
			"../../output-errors/non-existent-event-path/preload-events.ts",
		),
		eventSenderPath: join(
			__dirname,
			"../../output-errors/non-existent-event-path/event-sender.ts",
		),
		rendererEventsPath: join(
			__dirname,
			"../../output-errors/non-existent-event-path/renderer-events.tsx",
		),
	},
	// APIファイルは正常に生成されるが、イベントは空になる
	// build-errors.test.tsで特別に処理する
};

export default config;
