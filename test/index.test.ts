import { describe, it } from "node:test";
import { build, LogLevel, setLogLevel } from "../src/index.js";
import { assertFileContent } from "./utils/assert.js";

describe("Electron IPC自動生成", () => {
	it("APIディレクトリからregister、preload、rendererファイルを正しく生成する", async () => {
		// 準備
		const options = {
			targetDirPath: "./test/fixture/input/apis1",
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
		await assertFileContent(
			"./test/output/001/register.ts",
			"./test/fixture/expected/001/register.ts",
		);
		await assertFileContent(
			"./test/output/001/preload.ts",
			"./test/fixture/expected/001/preload.ts",
		);
		await assertFileContent(
			"./test/output/001/renderer.tsx",
			"./test/fixture/expected/001/renderer.tsx",
		);
	});

	it("引数なし関数のケースで_: unknownが生成される", async () => {
		// 準備
		const options = {
			targetDirPath: "./test/fixture/input/apis2",
			contextPath: "./test/fixture/input/context.ts",
			ignores: [],
			registerPath: "./test/output/002/register.ts",
			preloadPath: "./test/output/002/preload.ts",
			rendererPath: "./test/output/002/renderer.tsx",
		};

		// 実行
		setLogLevel(LogLevel.ERROR);
		await build(options);

		// 検証
		await assertFileContent(
			"./test/output/002/register.ts",
			"./test/fixture/expected/002/register.ts",
		);
		await assertFileContent(
			"./test/output/002/preload.ts",
			"./test/fixture/expected/002/preload.ts",
		);
		await assertFileContent(
			"./test/output/002/renderer.tsx",
			"./test/fixture/expected/002/renderer.tsx",
		);
	});
});
