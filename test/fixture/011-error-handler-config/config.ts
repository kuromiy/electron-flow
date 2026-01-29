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
		"preload/api.ts",
		"renderer/api.ts",
	],
};

export default config;
