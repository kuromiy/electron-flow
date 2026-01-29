// テストフィクスチャの期待出力を生成するスクリプト

import { cp, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, LogLevel, setLogLevel } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "fixture");
const OUTPUT_DIR = join(__dirname, "output");
const SHARED_DIR = join(FIXTURE_DIR, "_shared");

async function main() {
	setLogLevel(LogLevel.ERROR);

	const entries = await readdir(FIXTURE_DIR, { withFileTypes: true });
	const caseDirs = entries
		.filter((e) => e.isDirectory() && !e.name.startsWith("_"))
		.map((e) => e.name)
		.sort();

	for (const caseDir of caseDirs) {
		console.log(`Generating: ${caseDir}`);
		try {
			const configPath = join(FIXTURE_DIR, caseDir, "config.ts");
			const config = (await import(pathToFileURL(configPath).href)).default;

			// outputディレクトリに出力（build.test.tsと同じ相対パス）
			const options = {
				apiDirPath: join(FIXTURE_DIR, caseDir, "input/apis"),
				contextPath: join(SHARED_DIR, "context.ts"),
				registerPath: join(OUTPUT_DIR, caseDir, "register"),
				preloadPath: join(OUTPUT_DIR, caseDir, "preload"),
				rendererPath: join(OUTPUT_DIR, caseDir, "renderer"),
				...config.options,
			};

			// 古いビルド成果物を削除してクリーンビルドを保証
			await rm(join(OUTPUT_DIR, caseDir), { recursive: true, force: true });

			await build(options);

			// outputからexpectedにコピー
			const expectedDir = join(FIXTURE_DIR, caseDir, "expected");
			const outputCaseDir = join(OUTPUT_DIR, caseDir);

			// 既存のexpectedディレクトリを削除
			await rm(expectedDir, { recursive: true, force: true });
			// outputからexpectedにコピー
			await cp(outputCaseDir, expectedDir, { recursive: true });

			console.log(`  Done: ${caseDir}`);
		} catch (e) {
			console.error(`  Error in ${caseDir}:`, e);
		}
	}
}

main();
