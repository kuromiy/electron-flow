import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "基本: オブジェクト型引数の展開",
	options: {},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload/api.ts",
		"renderer/api.ts",
	],
};

export default config;
