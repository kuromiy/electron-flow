import { strictEqual } from "node:assert";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { build, LogLevel, setLogLevel } from "../src/index.js";

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
		const actualContent = await readFile(
			"./test/output/with-electron/register.ts",
			"utf-8",
		);
		const expectedContent = await readFile(
			"./test/fixture/expected/with-electron/register.ts",
			"utf-8",
		);
		strictEqual(actualContent, expectedContent);

		const actualContent2 = await readFile(
			"./test/output/with-electron/preload.ts",
			"utf-8",
		);
		const expectedContent2 = await readFile(
			"./test/fixture/expected/with-electron/preload.ts",
			"utf-8",
		);
		strictEqual(actualContent2, expectedContent2);

		const actualContent3 = await readFile(
			"./test/output/with-electron/renderer.tsx",
			"utf-8",
		);
		const expectedContent3 = await readFile(
			"./test/fixture/expected/with-electron/renderer.tsx",
			"utf-8",
		);
		strictEqual(actualContent3, expectedContent3);
	});
});
