// test/build-errors.test.ts

import assert from "node:assert";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, LogLevel, setLogLevel } from "../src/index.js";
import type { ErrorTestCase } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "fixture-errors");
const SHARED_DIR = join(__dirname, "fixture/_shared");
const OUTPUT_DIR = join(__dirname, "output-errors");

async function findTestCaseDirs(): Promise<string[]> {
	const entries = await readdir(FIXTURE_DIR, { withFileTypes: true });
	return entries
		.filter((e) => e.isDirectory())
		.map((e) => e.name)
		.sort();
}

describe("build() 異常系テスト", async () => {
	setLogLevel(LogLevel.ERROR);
	const caseDirs = await findTestCaseDirs();

	for (const caseDir of caseDirs) {
		const configPath = join(FIXTURE_DIR, caseDir, "config.ts");
		const config: ErrorTestCase = (await import(pathToFileURL(configPath).href))
			.default;

		it(config.name, async () => {
			const options = {
				targetDirPath: join(FIXTURE_DIR, caseDir, "input/apis"),
				contextPath: join(SHARED_DIR, "context.ts"),
				ignores: [],
				registerPath: join(OUTPUT_DIR, caseDir, "register"),
				preloadPath: join(OUTPUT_DIR, caseDir, "preload.ts"),
				rendererPath: join(OUTPUT_DIR, caseDir, "renderer.tsx"),
				...config.options,
			};

			if (config.expectError) {
				await assert.rejects(
					() => build(options),
					(err: Error) => {
						if (typeof config.expectError === "string") {
							return err.message.includes(config.expectError);
						}
						return config.expectError?.test(err.message) ?? false;
					},
				);
			} else if (config.expectResult) {
				const result = await build(options);
				assert.deepStrictEqual(result, config.expectResult);
			} else {
				// expectError も expectResult も指定されていない場合は、
				// エラーがスローされずに完了することを確認
				const result = await build(options);
				assert.ok(result, "Build should complete without error");
			}
		});
	}
});
