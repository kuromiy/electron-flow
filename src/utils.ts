import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * 指定したディレクトリ以下のファイルパスを再帰的に取得する
 * @param path 読み取り対象ディレクトリパス
 * @returns cwd起点の相対パスのファイルパスリスト
 */
export async function readFilePaths(path: string) {
	const files = await readdir(path, { recursive: true, withFileTypes: true });
	return (
		files
			.filter((file) => file.isFile())
			// TODO: 今後仕様変更、設定にある出力パスを除外するようにする
			.filter((file) => !file.name.startsWith("register."))
			.map((file) => join(file.parentPath, file.name))
	);
}
