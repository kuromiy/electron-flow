import type { ErrorTestCase } from "../../types.js";

const config: ErrorTestCase = {
	name: "exportなし関数のみで処理対象0件",
	options: {},
	expectResult: {
		sortedPackages: [],
		sortedEventPackages: [],
	},
};

export default config;
