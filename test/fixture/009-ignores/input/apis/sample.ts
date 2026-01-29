import type { Context } from "../../../_shared/context.js";

export async function included(ctx: Context): Promise<string> {
	return "included";
}

export async function excluded(ctx: Context): Promise<string> {
	return "excluded";
}
