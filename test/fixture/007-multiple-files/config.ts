import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "複数関数・複数ファイル",
	options: {},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload.ts",
		"renderer.tsx",
	],
};

export default config;
