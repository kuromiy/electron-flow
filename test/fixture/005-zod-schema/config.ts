import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "Zodスキーマから推論した型（型エイリアス使用）",
	options: {},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload.ts",
		"renderer.tsx",
	],
};

export default config;
