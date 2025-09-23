import { describe, it } from "node:test";
import { build, LogLevel, setLogLevel } from "../src/index.js";
import { assertFileContent } from "./utils/assert.js";

describe("Electron IPC自動生成 electronモジュールインポート時エラーが発生しないこと", () => {
	it("エラーが発生しないこと", async () => {
		// 準備
		const options = {
			targetDirPath: "./test/fixture/input/with-electron",
			contextPath: "./test/fixture/input/context.ts",
			ignores: [],
			registerPath: "./test/output/with-electron/register.ts",
			preloadPath: "./test/output/with-electron/preload.ts",
			rendererPath: "./test/output/with-electron/renderer.tsx",
		};

		// 実行
		setLogLevel(LogLevel.ERROR);
		await build(options);

		// 検証
		await assertFileContent(
			"./test/output/with-electron/register.ts",
			"./test/fixture/expected/with-electron/register.ts",
		);
		await assertFileContent(
			"./test/output/with-electron/preload.ts",
			"./test/fixture/expected/with-electron/preload.ts",
		);
		await assertFileContent(
			"./test/output/with-electron/renderer.tsx",
			"./test/fixture/expected/with-electron/renderer.tsx",
		);
	});
});
