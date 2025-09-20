import { strictEqual } from "node:assert";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { build, LogLevel, setLogLevel } from "../src/index.js";

describe("Electronモジュールインポートのリグレッションテスト", () => {
	it("Electronのdialogを含むファイルがエラーなくビルドできる", async () => {
		// 準備
		const options = {
			targetDirPath: "./test/fixture/input/with-electron",
			contextPath: "./test/fixture/input/context.ts",
			ignores: [],
			registerPath: "./test/output/with-electron/register.ts",
			preloadPath: "./test/output/with-electron/preload.ts",
			rendererPath: "./test/output/with-electron/renderer.tsx",
			// zodImportOptionsは省略（デフォルト設定で動作）
		};

		// 実行
		setLogLevel(LogLevel.ERROR);

		// ビルドがエラーをスローしないことを確認
		let buildError = null;
		try {
			await build(options);
		} catch (error) {
			buildError = error;
		}

		// 検証: エラーがスローされていない
		strictEqual(buildError, null, "ビルドがエラーをスローしました");

		// 検証: ファイルが生成されている
		strictEqual(
			existsSync("./test/output/with-electron/register.ts"),
			true,
			"register.tsが生成されていません",
		);
		strictEqual(
			existsSync("./test/output/with-electron/preload.ts"),
			true,
			"preload.tsが生成されていません",
		);
		strictEqual(
			existsSync("./test/output/with-electron/renderer.tsx"),
			true,
			"renderer.tsxが生成されていません",
		);

		// 検証: 期待ファイルと一致している
		const actualRegister = await readFile(
			"./test/output/with-electron/register.ts",
			"utf-8",
		);
		const expectedRegister = await readFile(
			"./test/fixture/expected/with-electron/register.ts",
			"utf-8",
		);
		strictEqual(
			actualRegister,
			expectedRegister,
			"register.tsの内容が期待と異なります",
		);

		const actualPreload = await readFile(
			"./test/output/with-electron/preload.ts",
			"utf-8",
		);
		const expectedPreload = await readFile(
			"./test/fixture/expected/with-electron/preload.ts",
			"utf-8",
		);
		strictEqual(
			actualPreload,
			expectedPreload,
			"preload.tsの内容が期待と異なります",
		);

		const actualRenderer = await readFile(
			"./test/output/with-electron/renderer.tsx",
			"utf-8",
		);
		const expectedRenderer = await readFile(
			"./test/fixture/expected/with-electron/renderer.tsx",
			"utf-8",
		);
		strictEqual(
			actualRenderer,
			expectedRenderer,
			"renderer.tsxの内容が期待と異なります",
		);
	});
});
