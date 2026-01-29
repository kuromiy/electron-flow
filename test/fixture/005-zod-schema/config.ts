import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "Zodスキーマから推論した型（型エイリアス使用）",
	options: {},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload/api.ts",
		"renderer/api.ts",
	],
};

export default config;
