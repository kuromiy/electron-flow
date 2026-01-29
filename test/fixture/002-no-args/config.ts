import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "引数なし関数",
	options: {},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload.ts",
		"renderer.tsx",
	],
};

export default config;
