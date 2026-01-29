// test/types.ts

import type { AutoCodeOption } from "../src/index.js";

/** 正常系: ファイル比較テスト */
export interface BuildTestCase {
	name: string;
	options?: Partial<AutoCodeOption>;
	expectedFiles: string[];
}

/** 異常系: エラー検証テスト */
export interface ErrorTestCase {
	name: string;
	options?: Partial<AutoCodeOption>;
	// どちらかを指定
	expectError?: string | RegExp; // エラーメッセージを検証
	expectResult?: {
		// 戻り値を検証（エラーではないが空など）
		sortedPackages: [];
		sortedEventPackages: [];
	};
}
