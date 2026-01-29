import type { Context } from "../../../_shared/context.js";

export async function processData(
	ctx: Context,
	req: { data: string },
): Promise<string> {
	if (!req.data) {
		throw new Error("Data is required");
	}
	return `processed: ${req.data}`;
}
