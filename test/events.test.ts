import { describe, it } from "node:test";
import { build, LogLevel, setLogLevel } from "../src/index.js";
import { assertFileContent } from "./utils/assert.js";

describe("Electron IPC イベント自動生成", () => {
	it("イベントディレクトリからpreload-events、event-sender、renderer-eventsファイルを正しく生成する", async () => {
		// 準備
		const options = {
			targetDirPath: "./test/fixture/input/apis1",
			contextPath: "./test/fixture/input/context.ts",
			ignores: [],
			registerPath: "./test/output/with-events/register",
			preloadPath: "./test/output/with-events/preload.ts",
			rendererPath: "./test/output/with-events/renderer.tsx",
			eventDirPath: "./test/fixture/input/events",
			preloadEventsPath: "./test/output/with-events/preload-events.ts",
			eventSenderPath: "./test/output/with-events/event-sender.ts",
			rendererEventsPath: "./test/output/with-events/renderer-events.tsx",
		};

		// 実行
		setLogLevel(LogLevel.ERROR);
		await build(options);

		// 検証
		await assertFileContent(
			"./test/output/with-events/preload-events.ts",
			"./test/fixture/expected/with-events/preload-events.ts",
		);
		await assertFileContent(
			"./test/output/with-events/event-sender.ts",
			"./test/fixture/expected/with-events/event-sender.ts",
		);
		await assertFileContent(
			"./test/output/with-events/renderer-events.tsx",
			"./test/fixture/expected/with-events/renderer-events.tsx",
		);
	});
});
