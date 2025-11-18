import { z } from "zod";
import type { Context } from "../context.js";

export const schema = z.object({
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
	searchQuery: z.string().optional(),
	sortKey: z.enum(["createdAt", "updatedAt", "serviceName"]).default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type Request = z.infer<typeof schema>;

export async function execute(ctx: Context, req: Request) {

}