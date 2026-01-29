import type { BuildTestCase } from "../../types.js";

const config: BuildTestCase = {
	name: "validator + errorHandler 両方",
	options: {
		validatorConfig: {
			pattern: "validate{FuncName}",
		},
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
