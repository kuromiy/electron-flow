import { strictEqual } from "node:assert";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { build, LogLevel, setLogLevel } from "../src/index.js";

describe("Electron IPC自動生成", () => {
	it("APIディレクトリからregister、preload、rendererファイルを正しく生成する", async () => {
		// 準備
		const options = {
			targetDirPath: "./test/fixture/input/apis",
			contextPath: "./test/fixture/input/context.ts",
			ignores: [],
			registerPath: "./test/output/001/register.ts",
			preloadPath: "./test/output/001/preload.ts",
			rendererPath: "./test/output/001/renderer.tsx",
		};

		// 実行
		setLogLevel(LogLevel.ERROR);
		await build(options);

		// 検証
		const actualContent = await readFile(
			"./test/output/001/register.ts",
			"utf-8",
		);
		const expectedContent = await readFile(
			"./test/fixture/expected/001/register.ts",
			"utf-8",
		);
		strictEqual(actualContent, expectedContent);

		const actualContent2 = await readFile(
			"./test/output/001/preload.ts",
			"utf-8",
		);
		const expectedContent2 = await readFile(
			"./test/fixture/expected/001/preload.ts",
			"utf-8",
		);
		strictEqual(actualContent2, expectedContent2);

		const actualContent3 = await readFile(
			"./test/output/001/renderer.tsx",
			"utf-8",
		);
		const expectedContent3 = await readFile(
			"./test/fixture/expected/001/renderer.tsx",
			"utf-8",
		);
		strictEqual(actualContent3, expectedContent3);
	});
});
