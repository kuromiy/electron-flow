import type { Context } from "../../../fixture/_shared/context.js";

export async function ping(_ctx: Context): Promise<string> {
	return "pong";
}
