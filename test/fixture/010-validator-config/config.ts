import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "validatorConfig",
	options: {
		validatorConfig: {
			pattern: "validate{FuncName}",
		},
	},
	expectedFiles: [
		"register/handlers.ts",
		"register/api.ts",
		"preload.ts",
		"renderer.tsx",
	],
};

export default config;
