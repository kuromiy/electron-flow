import type { Context } from "./context.js";
import type { Failure } from "../../src/result.js";

export interface AppError {
	code: string;
	message: string;
}

export function handleError(
	error: unknown,
	ctx: Context & { event: unknown },
): Failure<AppError> {
	return {
		_tag: "failure",
		value: {
			code: "UNKNOWN_ERROR",
			message: error instanceof Error ? error.message : "Unknown error",
		},
	};
}
