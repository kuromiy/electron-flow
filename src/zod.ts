import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { transformSync } from "esbuild";
import { ZodObject } from "zod";

/**
 * リクエストに使用しているZodObject情報
 */
export type ZodObjectInfo = {
	/**
	 * パス
	 */
	path: string;
	/**
	 * 宣言した変数名
	 */
	name: string;
	/**
	 * フィールド情報
	 */
	fields: {
		/**
		 * フィールド名
		 */
		name: string;
		/**
		 * フィールドの型
		 */
		type: string;
	}[];
};

// Zodインポートオプションの型定義
export interface ZodImportOptions {
	skipOnError?: boolean; // エラー時にスキップ（デフォルト: true）
	useTransform?: boolean; // esbuild変換を使用（デフォルト: true）
	problematicModules?: string[]; // 問題モジュールリスト
}

// デフォルトの問題モジュールリスト
const DEFAULT_PROBLEMATIC_MODULES = [
	"electron",
	"sharp",
	"bcrypt",
	"canvas",
	"sqlite3",
	"serialport",
];

// モジュールのモック定義を生成
function generateModuleMocks(modules: string[]): string {
	const mocks: string[] = [];
	for (const module of modules) {
		if (module === "electron") {
			mocks.push(`
				const electron = {
					app: {},
					BrowserWindow: class {},
					dialog: {
						showOpenDialog: () => {},
						showSaveDialog: () => {},
						showMessageBox: () => {}
					},
					ipcMain: {
						handle: () => {},
						on: () => {},
						once: () => {}
					},
					ipcRenderer: {
						invoke: () => {},
						send: () => {},
						on: () => {}
					},
					Menu: class {},
					MenuItem: class {},
					Tray: class {},
					nativeImage: {},
					shell: {},
					webContents: {}
				};
			`);
		} else {
			// 他のモジュールの基本的なモック
			mocks.push(`const ${module} = {};`);
		}
	}
	return mocks.join("\n");
}

// esbuildで変換してインポート
async function transformAndImport(
	filePath: string,
	problematicModules: string[],
): Promise<unknown> {
	const code = await readFile(filePath, "utf-8");

	// TypeScript/JSXをJavaScriptに変換
	const transformed = transformSync(code, {
		loader: filePath.endsWith(".tsx")
			? "tsx"
			: filePath.endsWith(".ts")
				? "ts"
				: filePath.endsWith(".jsx")
					? "jsx"
					: "js",
		format: "esm",
		platform: "node",
		target: "node18",
		// モックを注入
		banner: generateModuleMocks(problematicModules),
	});

	// インポート文を置換
	let finalCode = transformed.code;
	for (const module of problematicModules) {
		// ESMインポートの置換
		const esmPattern = new RegExp(
			`import\\s+(?:{[^}]*}|\\*\\s+as\\s+\\w+|\\w+)\\s+from\\s+['"]${module}['"]`,
			"g",
		);
		finalCode = finalCode.replace(
			esmPattern,
			`// $& (mocked by electron-flow)`,
		);

		// CommonJSの置換
		const cjsPattern = new RegExp(
			`(?:const|let|var)\\s+(?:{[^}]*}|\\w+)\\s*=\\s*require\\(['"]${module}['"]\\)`,
			"g",
		);
		finalCode = finalCode.replace(
			cjsPattern,
			`// $& (mocked by electron-flow)`,
		);
	}

	// データURLとして動的インポート
	const dataUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(finalCode)}`;
	return await import(dataUrl);
}

// モジュールをインポートする関数（フォールバック付き）
async function importModule(
	filePath: string,
	options: ZodImportOptions,
): Promise<unknown | null> {
	const {
		skipOnError = true,
		useTransform = true,
		problematicModules = DEFAULT_PROBLEMATIC_MODULES,
	} = options;

	// 1. 通常の動的インポートを試行
	try {
		const absolutePath = resolve(filePath);
		const fileUrl = pathToFileURL(absolutePath).href;
		return await import(fileUrl);
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		// 2. esbuild変換を試行（有効な場合）
		if (useTransform) {
			try {
				return await transformAndImport(filePath, problematicModules);
			} catch (transformError: unknown) {
				const transformErrorMessage =
					transformError instanceof Error
						? transformError.message
						: String(transformError);
				console.warn(
					`Failed to transform ${filePath}: ${transformErrorMessage}`,
				);
			}
		}

		// 3. エラーハンドリング
		if (skipOnError) {
			console.warn(`Skipping ${filePath}: ${errorMessage}`);
			return null;
		}
		throw new Error(`Failed to import ${filePath}: ${errorMessage}`);
	}
}

export async function getZodObjectInfos(
	paths: string[],
	list: ZodObjectInfo[] = [],
	options: ZodImportOptions = {},
) {
	for (const path of paths) {
		// フォールバック付きインポート
		const modules = await importModule(path, options);

		// モジュールがnullの場合はスキップ
		if (!modules) {
			continue;
		}

		// modulesの各エクスポートをループ
		for (const [key, value] of Object.entries(modules)) {
			if (isZodObject(value)) {
				const shapes = value.def.shape;
				const fields = Object.keys(shapes).map((key) => {
					const shape = shapes[key];
					return { name: key, type: collectZodObject(shape) };
				});
				list.push({ path: path, name: key, fields: fields });
			}
		}
	}
	return list;
}

function isZodObject(value: unknown): value is ZodObject {
	return value instanceof ZodObject;
}

// Zodの内部型を定義
interface ZodTypeDef {
	shape?: () => Record<string, unknown>;
	type?: unknown;
	innerType?: unknown;
}

interface ZodTypeWithDef {
	constructor: { name: string };
	_def: ZodTypeDef;
	options?: unknown[];
	value?: unknown;
}

function collectZodObject(value: unknown): string {
	// valueがオブジェクトでconstructorを持つことを確認
	if (!value || typeof value !== "object" || !("constructor" in value)) {
		return "unknown";
	}

	const zodValue = value as ZodTypeWithDef;
	const zodType = zodValue.constructor.name;

	if (zodType === "ZodObject") {
		const shape = zodValue._def.shape?.();
		if (!shape) return "{}";
		const body = Object.entries(shape).map(
			([key, value]) => `${key}: ${collectZodObject(value)}`,
		);
		return `{${body.join(", ")}}`;
	}

	if (zodType === "ZodArray") {
		return `${collectZodObject(zodValue._def.type)}[]`;
	}

	if (zodType === "ZodUnion") {
		const options = zodValue.options as unknown[];
		return options.map((x: unknown) => collectZodObject(x)).join(" | ");
	}

	if (zodType === "ZodLiteral") {
		return `"${zodValue.value}"`;
	}

	if (zodType === "ZodOptional") {
		// TODO: undefinedではなく、?をつけたい。(例: value: string | undefined -> value?: string)
		return `${collectZodObject(zodValue._def.innerType)} | undefined`;
	}

	if (zodType === "ZodDefault") {
		return collectZodObject(zodValue._def.innerType);
	}

	if (zodType === "ZodString") {
		return "string";
	}

	if (zodType === "ZodNumber") {
		return "number";
	}

	if (zodType === "ZodBoolean") {
		return "boolean";
	}

	return zodType;
}
