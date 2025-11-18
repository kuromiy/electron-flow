import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { type ZodEnum, ZodObject } from "zod";

const require = createRequire(import.meta.url);

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

export async function getZodObjectInfos(
	paths: string[],
	list: ZodObjectInfo[] = [],
) {
	for (const path of paths) {
		// 相対パスを絶対パスに変換
		const absolutePath = resolve(path);
		// file:// URLに変換
		const fileUrl = pathToFileURL(absolutePath).href;
		const modules = require(fileUrl);

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

	/**
	 * ZodEnumは下記
	 * ZodEnum {
	 *		'~standard': { validate: [Function: validate], vendor: 'zod', version: 1 },
	 *		def: { type: 'enum', entries: { asc: 'asc', desc: 'desc' } },
	 *		type: 'enum',
	 */
	if (zodType === "ZodEnum") {
		return Object.keys((zodValue as ZodEnum).def.entries)
			.map((key) => `"${key}"`)
			.join(" | ");
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
