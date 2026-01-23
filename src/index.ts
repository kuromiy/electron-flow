import { existsSync, statSync, watch } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { formatEventSender } from "./format/event-sender.js";
import { formatPreload } from "./format/preload.js";
import { formatPreloadEvents } from "./format/preload-events.js";
import {
	formatHandlers,
	formatRegisterAPI,
	type ValidatorConfig,
} from "./format/register.js";
import { formatRendererIF } from "./format/renderer.js";
import { formatRendererEvents } from "./format/renderer-events.js";
import { logger } from "./logger.js";
import { parseEventFile, parseFile } from "./parse.js";
import { readFilePaths } from "./utils.js";

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
	/** レジスター用コードの出力先ディレクトリ（handlers.tsとapi.tsが出力される） */
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
	/** バリデーター設定（オプション） */
	validatorConfig?: ValidatorConfig;
	/** イベント定義用ディレクトリパス（オプション） */
	eventDirPath?: string;
	/** イベント用プリロードコードの出力先パス（オプション） */
	preloadEventsPath?: string;
	/** EventSender用コードの出力先パス（オプション） */
	eventSenderPath?: string;
	/** イベント用レンダラーコードの出力先パス（オプション） */
	rendererEventsPath?: string;
};

// ValidatorConfig型を再エクスポート
export type { ValidatorConfig };

export async function build({
	targetDirPath,
	ignores,
	preloadPath,
	registerPath,
	rendererPath,
	contextPath,
	customErrorHandler,
	unwrapResults = false,
	validatorConfig,
	eventDirPath,
	preloadEventsPath,
	eventSenderPath,
	rendererEventsPath,
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
		return { sortedPackages: [], sortedEventPackages: [] };
	}

	// parseFileでインポートされたファイルも収集
	const { packages } = parseFile(ignores, files, [], validatorConfig?.pattern);

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

	const preloadText = formatPreload(sortedPackages);
	const handlersText = formatHandlers(
		sortedPackages,
		registerPath,
		contextPath,
		customErrorHandler,
		validatorConfig,
	);
	const registerAPIText = formatRegisterAPI(
		sortedPackages,
		registerPath,
		contextPath,
	);
	const rendererText = formatRendererIF(
		sortedPackages,
		dirname(rendererPath),
		unwrapResults,
		customErrorHandler,
	);

	logger.info("Creating output directories...");
	await mkdir(dirname(preloadPath), { recursive: true });
	await mkdir(registerPath, { recursive: true });
	await mkdir(dirname(rendererPath), { recursive: true });

	logger.info("Writing generated files...");
	await writeFile(preloadPath, preloadText);
	logger.debug(`Wrote preload to: ${preloadPath}`);
	const handlersPath = join(registerPath, "handlers.ts");
	const apiPath = join(registerPath, "api.ts");
	await writeFile(handlersPath, handlersText);
	logger.debug(`Wrote handlers to: ${handlersPath}`);
	await writeFile(apiPath, registerAPIText);
	logger.debug(`Wrote api to: ${apiPath}`);
	await writeFile(rendererPath, rendererText);
	logger.debug(`Wrote renderer to: ${rendererPath}`);

	// イベント関連ファイルの生成
	let sortedEventPackages: ReturnType<typeof parseEventFile>["packages"] = [];
	if (
		eventDirPath &&
		preloadEventsPath &&
		eventSenderPath &&
		rendererEventsPath
	) {
		if (existsSync(eventDirPath)) {
			const eventFiles = await readFilePaths(eventDirPath);
			logger.info(`Found ${eventFiles.length} event files to process`);
			logger.debugObject("Event file list:", eventFiles);

			if (eventFiles.length > 0) {
				const { packages: eventPackages } = parseEventFile(eventFiles);

				const totalEvents = eventPackages.reduce(
					(sum, pkg) => sum + pkg.events.length,
					0,
				);
				logger.info(
					`Parsed ${eventPackages.length} event packages with ${totalEvents} events`,
				);
				logger.debugObject("Event packages detail:", eventPackages);

				sortedEventPackages = eventPackages
					.toSorted((a, b) => a.path.localeCompare(b.path))
					.map((pkg) => ({
						...pkg,
						events: pkg.events.toSorted((a, b) => a.name.localeCompare(b.name)),
					}));
			}

			const preloadEventsText = formatPreloadEvents(
				sortedEventPackages,
				dirname(preloadEventsPath),
			);
			const eventSenderText = formatEventSender(
				sortedEventPackages,
				dirname(eventSenderPath),
			);
			const rendererEventsText = formatRendererEvents(
				sortedEventPackages,
				dirname(rendererEventsPath),
			);

			await mkdir(dirname(preloadEventsPath), { recursive: true });
			await mkdir(dirname(eventSenderPath), { recursive: true });
			await mkdir(dirname(rendererEventsPath), { recursive: true });

			await writeFile(preloadEventsPath, preloadEventsText);
			logger.debug(`Wrote preload-events to: ${preloadEventsPath}`);
			await writeFile(eventSenderPath, eventSenderText);
			logger.debug(`Wrote event-sender to: ${eventSenderPath}`);
			await writeFile(rendererEventsPath, rendererEventsText);
			logger.debug(`Wrote renderer-events to: ${rendererEventsPath}`);
		} else {
			logger.warn(`Event directory does not exist: ${eventDirPath}`);
		}
	}

	logger.info("Build completed successfully.");

	return { sortedPackages, sortedEventPackages };
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
	validatorConfig,
}: AutoCodeOption) {
	if (!existsSync(targetDirPath)) {
		throw new Error(`Target directory does not exist: ${targetDirPath}`);
	}

	// 初回ビルド
	let { sortedPackages } = await build({
		targetDirPath,
		ignores,
		preloadPath,
		registerPath,
		rendererPath,
		contextPath,
		...(customErrorHandler && { customErrorHandler }),
		unwrapResults,
		...(validatorConfig && { validatorConfig }),
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

			sortedPackages = sortedPackages.filter((file) => file.path !== fullPath);

			// 配列が空になった場合のチェック
			if (sortedPackages.length === 0) {
				logger.info("All files have been deleted, generating empty templates");
			}

			sortedPackages.sort((a, b) => a.path.localeCompare(b.path));
			sortedPackages.forEach((pkg) => {
				pkg.func.sort((a, b) => a.name.localeCompare(b.name));
			});

			const preloadText = formatPreload(sortedPackages);
			const handlersText = formatHandlers(
				sortedPackages,
				registerPath,
				contextPath,
				customErrorHandler,
				validatorConfig,
			);
			const registerAPIText = formatRegisterAPI(
				sortedPackages,
				registerPath,
				contextPath,
			);
			const rendererText = formatRendererIF(
				sortedPackages,
				dirname(rendererPath),
				unwrapResults,
				customErrorHandler,
			);

			// 初回ビルドがスキップされた場合でも動作するようディレクトリを作成
			await mkdir(dirname(preloadPath), { recursive: true });
			await mkdir(registerPath, { recursive: true });
			await mkdir(dirname(rendererPath), { recursive: true });

			await writeFile(preloadPath, preloadText);
			const handlersPath = join(registerPath, "handlers.ts");
			const apiPath = join(registerPath, "api.ts");
			await writeFile(handlersPath, handlersText);
			await writeFile(apiPath, registerAPIText);
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

		sortedPackages = sortedPackages.filter((file) => file.path !== fullPath);

		// parseFileで解析
		const parseResult = parseFile(
			ignores,
			[fullPath],
			sortedPackages,
			validatorConfig?.pattern,
		);
		sortedPackages = parseResult.packages;

		sortedPackages.sort((a, b) => a.path.localeCompare(b.path));
		sortedPackages.forEach((pkg) => {
			pkg.func.sort((a, b) => a.name.localeCompare(b.name));
		});

		const preloadText = formatPreload(sortedPackages);
		const handlersText = formatHandlers(
			sortedPackages,
			registerPath,
			contextPath,
			customErrorHandler,
			validatorConfig,
		);
		const registerAPIText = formatRegisterAPI(
			sortedPackages,
			registerPath,
			contextPath,
		);
		const rendererText = formatRendererIF(
			sortedPackages,
			dirname(rendererPath),
			unwrapResults,
			customErrorHandler,
		);

		// 初回ビルドがスキップされた場合でも動作するようディレクトリを作成
		await mkdir(dirname(preloadPath), { recursive: true });
		await mkdir(registerPath, { recursive: true });
		await mkdir(dirname(rendererPath), { recursive: true });

		await writeFile(preloadPath, preloadText);
		const handlersPath = join(registerPath, "handlers.ts");
		const apiPath = join(registerPath, "api.ts");
		await writeFile(handlersPath, handlersText);
		await writeFile(apiPath, registerAPIText);
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
