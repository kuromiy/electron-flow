import type { Context } from "../../../_shared/context.js";

export async function updateItem(
	ctx: Context,
	req: { id: string; name?: string; description?: string },
): Promise<{ updated: boolean }> {
	return { updated: true };
}
