import type { BuildTestCase } from "../../types.js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: BuildTestCase = {
	name: "イベント機能",
	options: {
		// eventDirPathは入力の場所なのでそのまま
		eventDirPath: join(__dirname, "input/events"),
		// 出力パスは相対的な値を使い、テストで上書きする
		// (テスト側でOUTPUT_DIRを基準に設定)
	},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload.ts",
		"renderer.tsx",
		"preload-events.ts",
		"event-sender.ts",
		"renderer-events.tsx",
	],
	hasEvents: true,
};

export default config;
