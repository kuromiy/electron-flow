import type { Context } from "../../../_shared/context.js";

interface AppError {
	code: string;
	message: string;
}

export function saveDataErrorHandler(
	error: unknown,
	ctx: Context & { event: unknown },
): AppError | null {
	if (error instanceof Error && error.message.includes("validation")) {
		return { code: "VALIDATION_ERROR", message: error.message };
	}
	return null; // グローバルハンドラーにフォールバック
}

export async function saveData(
	ctx: Context,
	req: { data: string },
): Promise<{ saved: boolean }> {
	return { saved: true };
}
