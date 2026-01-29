import type { BuildTestCase } from "../../types.js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: BuildTestCase = {
	name: "イベント機能",
	options: {
		eventDirPath: join(__dirname, "input/events"),
	},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"register/event-sender.ts",
		"preload/api.ts",
		"preload/event.ts",
		"renderer/api.ts",
		"renderer/event.ts",
	],
};

export default config;
