import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "errorHandlerConfig",
	options: {
		errorHandlerConfig: {
			pattern: "{funcName}ErrorHandler",
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
