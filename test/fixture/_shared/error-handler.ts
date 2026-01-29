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
		isSuccess: false,
		isFailure: true,
		value: {
			code: "UNKNOWN_ERROR",
			message: error instanceof Error ? error.message : "Unknown error",
		},
	};
}
