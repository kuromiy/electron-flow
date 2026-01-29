import type { Context } from "../../../_shared/context.js";

export async function execute(
	ctx: Context,
	req: { id: string; name: string },
): Promise<string> {
	return `${ctx.userId}: ${req.id} - ${req.name}`;
}
