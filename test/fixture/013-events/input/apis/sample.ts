import type { Context } from "../../../_shared/context.js";

export async function ping(ctx: Context): Promise<string> {
	return "pong";
}
