import type { Context } from "../../../_shared/context.js";

interface ValidationError {
	field: string;
	reason: string;
}

// 個別エラーハンドラーあり
export function saveDataErrorHandler(
	error: unknown,
	_ctx: Context & { event: unknown },
): ValidationError | null {
	if (error instanceof Error && error.message.includes("validation")) {
		return { field: "data", reason: error.message };
	}
	return null; // カスタムエラーハンドラーにフォールバック
}

export async function saveData(
	ctx: Context,
	req: { data: string },
): Promise<{ saved: boolean }> {
	return { saved: true };
}

// 個別エラーハンドラーなし（カスタムエラーハンドラーのみ使用）
export async function processData(
	ctx: Context,
	req: { data: string },
): Promise<{ processed: boolean }> {
	return { processed: true };
}
