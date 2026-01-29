import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "外部ファイルの型参照",
	options: {},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload/api.ts",
		"renderer/api.ts",
	],
};

export default config;
