import type { Context } from "../../../_shared/context.js";

export async function alpha(ctx: Context): Promise<string> {
	return "alpha";
}

export async function beta(
	ctx: Context,
	req: { value: number },
): Promise<number> {
	return req.value * 2;
}
