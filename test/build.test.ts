// test/build.test.ts

import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, LogLevel, setLogLevel } from "../src/index.js";
import type { BuildTestCase } from "./types.js";
import { assertFileContent } from "./utils/assert.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "fixture");
const OUTPUT_DIR = join(__dirname, "output");
const SHARED_DIR = join(FIXTURE_DIR, "_shared");

async function findTestCaseDirs(): Promise<string[]> {
	const entries = await readdir(FIXTURE_DIR, { withFileTypes: true });
	return entries
		.filter((e) => e.isDirectory() && !e.name.startsWith("_"))
		.map((e) => e.name)
		.sort();
}

describe("build() 正常系テスト", async () => {
	setLogLevel(LogLevel.ERROR);
	const caseDirs = await findTestCaseDirs();

	for (const caseDir of caseDirs) {
		const configPath = join(FIXTURE_DIR, caseDir, "config.ts");
		const config: BuildTestCase = (await import(pathToFileURL(configPath).href))
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
				// イベント機能がある場合は出力パスを設定
				...(config.hasEvents
					? {
							preloadEventsPath: join(OUTPUT_DIR, caseDir, "preload-events.ts"),
							eventSenderPath: join(OUTPUT_DIR, caseDir, "event-sender.ts"),
							rendererEventsPath: join(
								OUTPUT_DIR,
								caseDir,
								"renderer-events.tsx",
							),
						}
					: {}),
			};

			await build(options);

			for (const file of config.expectedFiles) {
				await assertFileContent(
					join(OUTPUT_DIR, caseDir, file),
					join(FIXTURE_DIR, caseDir, "expected", file),
				);
			}
		});
	}
});
