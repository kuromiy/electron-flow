import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "ignores",
	options: {
		ignores: ["sample.excluded"],
	},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload/api.ts",
		"renderer/api.ts",
	],
};

export default config;
