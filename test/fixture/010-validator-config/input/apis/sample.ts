import type { Context } from "../../../_shared/context.js";

interface CreateItemRequest {
	name: string;
	price: number;
}

export function validateCreateItem(
	args: unknown,
	ctx: Context & { event: unknown },
): CreateItemRequest {
	const req = args as CreateItemRequest;
	if (!req.name || typeof req.name !== "string") {
		throw new Error("name is required");
	}
	if (typeof req.price !== "number" || req.price < 0) {
		throw new Error("price must be a positive number");
	}
	return req;
}

export async function createItem(
	ctx: Context,
	req: CreateItemRequest,
): Promise<{ id: string; name: string }> {
	return { id: "new-item", name: req.name };
}
