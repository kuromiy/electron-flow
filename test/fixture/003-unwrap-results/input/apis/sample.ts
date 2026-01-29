import type { Context } from "../../../_shared/context.js";

export async function getData(
	ctx: Context,
	req: { id: string },
): Promise<{ name: string; value: number }> {
	return { name: `item-${req.id}`, value: 42 };
}
