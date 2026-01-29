import type { ErrorTestCase } from "../../types.js";

const config: ErrorTestCase = {
	name: "存在しないapiDirPathでエラー",
	options: {
		apiDirPath: "./non-existent-path",
	},
	expectError: "Target directory does not exist",
};

export default config;
