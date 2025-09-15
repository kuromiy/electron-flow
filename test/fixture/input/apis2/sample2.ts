import type { Context } from "../context.js";

export async function ping(ctx: Context) {
	return "pong";
}