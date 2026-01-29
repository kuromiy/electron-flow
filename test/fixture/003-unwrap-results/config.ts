import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "unwrapResults=true でResult型をアンラップ",
	options: {
		unwrapResults: true,
	},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload.ts",
		"renderer.tsx",
	],
};

export default config;
