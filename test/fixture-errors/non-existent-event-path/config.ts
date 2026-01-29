import type { ErrorTestCase } from "../../types.js";

const config: ErrorTestCase = {
	name: "存在しないeventDirPathで警告ログ出力、イベント生成スキップ",
	options: {
		eventDirPath: "./non-existent-event-path",
	},
	// APIファイルは正常に生成されるが、イベントは空になる
	// build-errors.test.tsで特別に処理する
};

export default config;
