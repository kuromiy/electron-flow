import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "ignores",
	options: {
		ignores: ["sample.excluded"],
	},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload.ts",
		"renderer.tsx",
	],
};

export default config;
