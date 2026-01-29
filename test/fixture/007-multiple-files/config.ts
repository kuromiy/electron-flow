import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "複数関数・複数ファイル",
	options: {},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload/api.ts",
		"renderer/api.ts",
	],
};

export default config;
