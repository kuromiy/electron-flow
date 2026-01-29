import type { ErrorTestCase } from "../../types.js";

const config: ErrorTestCase = {
	name: "空のディレクトリでビルドスキップ",
	options: {},
	expectResult: {
		sortedPackages: [],
		sortedEventPackages: [],
	},
};

export default config;
