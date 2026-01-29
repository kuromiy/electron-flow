import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "外部ファイルの型参照",
	options: {},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload.ts",
		"renderer.tsx",
	],
};

export default config;
