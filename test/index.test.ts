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

	it("unwrapResults=trueでResult型をアンラップして例外ベースのAPIが生成される", async () => {
		// 準備
		const options = {
			targetDirPath: "./test/fixture/input/apis1",
			contextPath: "./test/fixture/input/context.ts",
			ignores: [],
			registerPath: "./test/output/003/register.ts",
			preloadPath: "./test/output/003/preload.ts",
			rendererPath: "./test/output/003/renderer.tsx",
			unwrapResults: true,
		};

		// 実行
		setLogLevel(LogLevel.ERROR);
		await build(options);

		// 検証
		await assertFileContent(
			"./test/output/003/register.ts",
			"./test/fixture/expected/003/register.ts",
		);
		await assertFileContent(
			"./test/output/003/preload.ts",
			"./test/fixture/expected/003/preload.ts",
		);
		await assertFileContent(
			"./test/output/003/renderer.tsx",
			"./test/fixture/expected/003/renderer.tsx",
		);
	});

	it("別ファイルに定義されたZodスキーマを正しく解析できる", async () => {
		// 準備
		const options = {
			targetDirPath: "./test/fixture/input/apis-with-external-schema",
			contextPath: "./test/fixture/input/context.ts",
			ignores: [],
			registerPath: "./test/output/004/register.ts",
			preloadPath: "./test/output/004/preload.ts",
			rendererPath: "./test/output/004/renderer.tsx",
		};

		// 実行
		setLogLevel(LogLevel.ERROR);
		await build(options);

		// 検証
		await assertFileContent(
			"./test/output/004/register.ts",
			"./test/fixture/expected/004/register.ts",
		);
		await assertFileContent(
			"./test/output/004/preload.ts",
			"./test/fixture/expected/004/preload.ts",
		);
		await assertFileContent(
			"./test/output/004/renderer.tsx",
			"./test/fixture/expected/004/renderer.tsx",
		);
	});

	it("enumを含むスキーマ定義が成功すること", async () => {
		// 準備
		const options = {
			targetDirPath: "./test/fixture/input/apis3",
			contextPath: "./test/fixture/input/context.ts",
			ignores: [],
			registerPath: "./test/output/005/register.ts",
			preloadPath: "./test/output/005/preload.ts",
			rendererPath: "./test/output/005/renderer.tsx",
		};

		// 実行
		setLogLevel(LogLevel.ERROR);
		await build(options);

		// 検証
		await assertFileContent(
			"./test/output/005/register.ts",
			"./test/fixture/expected/005/register.ts",
		);
		await assertFileContent(
			"./test/output/005/preload.ts",
			"./test/fixture/expected/005/preload.ts",
		);
		await assertFileContent(
			"./test/output/005/renderer.tsx",
			"./test/fixture/expected/005/renderer.tsx",
		);
	});
});
