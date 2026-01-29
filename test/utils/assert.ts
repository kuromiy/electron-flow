// test/utils/assert.ts

import assert from "node:assert";
import { readFile } from "node:fs/promises";

/**
 * 2つのファイルの内容を比較する
 * @param actualPath 実際の出力ファイルパス
 * @param expectedPath 期待される内容のファイルパス
 */
export async function assertFileContent(
	actualPath: string,
	expectedPath: string,
): Promise<void> {
	const [actual, expected] = await Promise.all([
		readFile(actualPath, "utf-8"),
		readFile(expectedPath, "utf-8"),
	]);

	// 改行コードを統一して比較
	const normalizedActual = actual.replace(/\r\n/g, "\n").trim();
	const normalizedExpected = expected.replace(/\r\n/g, "\n").trim();

	assert.strictEqual(
		normalizedActual,
		normalizedExpected,
		`File content mismatch:\n  Actual: ${actualPath}\n  Expected: ${expectedPath}`,
	);
}
