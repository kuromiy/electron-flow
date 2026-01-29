import type { BuildTestCase } from "../../types.js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: BuildTestCase = {
	name: "customErrorHandler",
	options: {
		customErrorHandler: {
			path: join(__dirname, "../_shared/error-handler.ts"),
			functionName: "handleError",
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
