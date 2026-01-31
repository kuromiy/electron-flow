import type { Context } from "./context.js";

export interface AppError {
	code: string;
	message: string;
}

export function handleError(
	error: unknown,
	_ctx: Context & { event: unknown },
): AppError {
	return {
		code: "UNKNOWN_ERROR",
		message: error instanceof Error ? error.message : "Unknown error",
	};
}
