import { existsSync, statSync, watch } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { formatPreload } from "./format/preload.js";
import { formatRegister } from "./format/register.js";
import { formatRendererIF } from "./format/renderer.js";
import { logger } from "./logger.js";
import { parseFile } from "./parse.js";
import { readFilePaths } from "./utils.js";
import { getZodObjectInfos } from "./zod.js";

// ロガー設定関数をエクスポート
export { LogLevel, setLogLevel, setLogLevelByName } from "./logger.js";
// Result型とError型を再エクスポート
export * from "./result.js";

/**
 * 自動コード生成のオプション設定
 */
type AutoCodeOption = {
	/** 処理対象のディレクトリパス */
	targetDirPath: string;
	/** 除外するファイルパターンのリスト */
	ignores: string[];
	/** プリロード用コードの出力先パス */
	preloadPath: string;
	/** レジスター用コードの出力先パス */
	registerPath: string;
	/** レンダラー用インターフェースコードの出力先パス */
	rendererPath: string;
	/** Context パス */
	contextPath: string;
	/** カスタムエラーハンドラー設定（オプション） */
	customErrorHandler?: {
		/** エラーハンドラーファイルのパス */
		path: string;
		/** エクスポートされた関数名 */
		functionName: string;
	};
	/** Result型をアンラップして例外ベースのAPIに変換するか（デフォルト: false） */
	unwrapResults?: boolean;
};

export async function build({
	targetDirPath,
	ignores,
	preloadPath,
	registerPath,
	rendererPath,
	contextPath,
	customErrorHandler,
	unwrapResults = false,
}: AutoCodeOption) {
	if (!existsSync(targetDirPath)) {
		throw new Error(`Target directory does not exist: ${targetDirPath}`);
	}

	const files = await readFilePaths(targetDirPath);
	logger.info(`Found ${files.length} files to process`);
	logger.debugObject("File list:", files);

	// ファイルが0個の場合は後続の処理をスキップして空の結果を返す
	if (files.length === 0) {
		logger.info("No files found in targetDirPath, skipping build");
		return { zodObjectInfos: [], sortedPackages: [] };
	}

	const zodObjectInfos = await getZodObjectInfos(files);
	logger.info(`Found ${zodObjectInfos.length} Zod objects`);
	logger.debugObject("Zod objects detail:", zodObjectInfos);

	const packages = parseFile(ignores, files);
	const totalFunctions = packages.reduce(
		(sum, pkg) => sum + pkg.func.length,
		0,
	);
	logger.info(
		`Parsed ${packages.length} packages with ${totalFunctions} functions`,
	);
	logger.debugObject("Packages detail:", packages);

	const sortedPackages = packages
		.toSorted((a, b) => a.path.localeCompare(b.path))
		.map((pkg) => ({
			...pkg,
			func: pkg.func.toSorted((a, b) => a.name.localeCompare(b.name)),
		}));

	const preloadText = formatPreload(zodObjectInfos, sortedPackages);
	const registerText = formatRegister(
		sortedPackages,
		dirname(registerPath),
		contextPath,
		customErrorHandler,
	);
	const rendererText = formatRendererIF(
		sortedPackages,
		zodObjectInfos,
		dirname(rendererPath),
		unwrapResults,
	);

	logger.info("Creating output directories...");
	await mkdir(dirname(preloadPath), { recursive: true });
	await mkdir(dirname(registerPath), { recursive: true });
	await mkdir(dirname(rendererPath), { recursive: true });

	logger.info("Writing generated files...");
	await writeFile(preloadPath, preloadText);
	logger.debug(`Wrote preload to: ${preloadPath}`);
	await writeFile(registerPath, registerText);
	logger.debug(`Wrote register to: ${registerPath}`);
	await writeFile(rendererPath, rendererText);
	logger.debug(`Wrote renderer to: ${rendererPath}`);

	logger.info("Build completed successfully.");

	return { zodObjectInfos, sortedPackages };
}

export async function watchBuild({
	targetDirPath,
	ignores,
	preloadPath,
	registerPath,
	rendererPath,
	contextPath,
	customErrorHandler,
	unwrapResults = false,
}: AutoCodeOption) {
	if (!existsSync(targetDirPath)) {
		throw new Error(`Target directory does not exist: ${targetDirPath}`);
	}

	// 初回ビルド
	let { zodObjectInfos, sortedPackages } = await build({
		targetDirPath,
		ignores,
		preloadPath,
		registerPath,
		rendererPath,
		contextPath,
		...(customErrorHandler && { customErrorHandler }),
		unwrapResults,
	});

	// ファイル監視
	watch(targetDirPath, { recursive: true }, async (eventType, fileName) => {
		if (!fileName) {
			return;
		}

		// ロック取得
		using locked = lock(fileName);
		if (!locked.isLock) {
			return;
		}

		const fullPath = join(targetDirPath, fileName);
		const stats = statSync(fullPath, { throwIfNoEntry: false });
		// ファイルが削除されたのでそれに関する処理を実行
		if (!stats) {
			logger.info(`File deleted: ${fileName}`);

			zodObjectInfos = zodObjectInfos.filter((info) => info.path !== fullPath);
			sortedPackages = sortedPackages.filter((file) => file.path !== fullPath);

			// 配列が空になった場合のチェック
			if (zodObjectInfos.length === 0 && sortedPackages.length === 0) {
				logger.info("All files have been deleted, generating empty templates");
			}

			sortedPackages.sort((a, b) => a.path.localeCompare(b.path));
			sortedPackages.forEach((pkg) => {
				pkg.func.sort((a, b) => a.name.localeCompare(b.name));
			});

			const preloadText = formatPreload(zodObjectInfos, sortedPackages);
			const registerText = formatRegister(
				sortedPackages,
				dirname(registerPath),
				contextPath,
				customErrorHandler,
			);
			const rendererText = formatRendererIF(
				sortedPackages,
				zodObjectInfos,
				dirname(rendererPath),
				unwrapResults,
			);

			// 初回ビルドがスキップされた場合でも動作するようディレクトリを作成
			await mkdir(dirname(preloadPath), { recursive: true });
			await mkdir(dirname(registerPath), { recursive: true });
			await mkdir(dirname(rendererPath), { recursive: true });

			await writeFile(preloadPath, preloadText);
			await writeFile(registerPath, registerText);
			await writeFile(rendererPath, rendererText);

			logger.info("Rebuild completed successfully.");

			return;
		}
		// ディレクトリの場合は無視
		if (stats.isDirectory()) {
			return;
		}
		// renameの場合、新規or削除になりビルド不要
		if (eventType === "rename") {
			return;
		}

		logger.info(`File changed: ${fullPath}`);

		zodObjectInfos = zodObjectInfos.filter((info) => info.path !== fullPath);
		sortedPackages = sortedPackages.filter((file) => file.path !== fullPath);

		zodObjectInfos = await getZodObjectInfos([fullPath], zodObjectInfos);
		sortedPackages = parseFile(ignores, [fullPath], sortedPackages);

		sortedPackages.sort((a, b) => a.path.localeCompare(b.path));
		sortedPackages.forEach((pkg) => {
			pkg.func.sort((a, b) => a.name.localeCompare(b.name));
		});

		const preloadText = formatPreload(zodObjectInfos, sortedPackages);
		const registerText = formatRegister(
			sortedPackages,
			dirname(registerPath),
			contextPath,
			customErrorHandler,
		);
		const rendererText = formatRendererIF(
			sortedPackages,
			zodObjectInfos,
			dirname(rendererPath),
			unwrapResults,
		);

		// 初回ビルドがスキップされた場合でも動作するようディレクトリを作成
		await mkdir(dirname(preloadPath), { recursive: true });
		await mkdir(dirname(registerPath), { recursive: true });
		await mkdir(dirname(rendererPath), { recursive: true });

		await writeFile(preloadPath, preloadText);
		await writeFile(registerPath, registerText);
		await writeFile(rendererPath, rendererText);

		logger.info("Rebuild completed successfully.");
	});
}

// ロック
const lockMap = new Map<string, boolean>();
function lock(_fileName: string) {
	// TODO: 一旦ファイル毎でロックするのをやめて全体でロックする
	const FILE_NAME = "lock";
	const isLock = lockMap.get(FILE_NAME);
	// true の場合まだビルド中だからロックをとれない
	if (isLock) {
		return {
			isLock: false,
			// 別でビルド中なのでlockMapは更新しない
			[Symbol.dispose]: () => {},
		};
	}
	// ロックを取得
	lockMap.set(FILE_NAME, true);
	return {
		isLock: true,
		[Symbol.dispose]: () => {
			lockMap.set(FILE_NAME, false);
		},
	};
}
