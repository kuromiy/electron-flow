import type { Context } from "../../../_shared/context.js";

interface UpdateRequest {
	id: string;
	value: number;
}

interface AppError {
	code: string;
	message: string;
}

export function validateUpdateRecord(
	args: unknown,
	ctx: Context & { event: unknown },
): UpdateRequest {
	const req = args as UpdateRequest;
	if (!req.id || typeof req.id !== "string") {
		throw new Error("id is required");
	}
	if (typeof req.value !== "number") {
		throw new Error("value must be a number");
	}
	return req;
}

export function updateRecordErrorHandler(
	error: unknown,
	ctx: Context & { event: unknown },
): AppError | null {
	if (error instanceof Error) {
		return { code: "UPDATE_ERROR", message: error.message };
	}
	return null;
}

export async function updateRecord(
	ctx: Context,
	req: UpdateRequest,
): Promise<{ updated: boolean }> {
	return { updated: true };
}
