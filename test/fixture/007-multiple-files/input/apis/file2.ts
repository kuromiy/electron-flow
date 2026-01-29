import type { Context } from "../../../_shared/context.js";

export async function gamma(
	ctx: Context,
	req: { name: string },
): Promise<string> {
	return `Hello, ${req.name}`;
}
