import { strictEqual } from "node:assert";
import { readFile } from "node:fs/promises";

export async function assertFileContent(
	actualPath: string,
	expectedPath: string,
) {
	const actualContent = await readFile(actualPath, "utf-8");
	const expectedContent = await readFile(expectedPath, "utf-8");
	strictEqual(actualContent, expectedContent);
}
