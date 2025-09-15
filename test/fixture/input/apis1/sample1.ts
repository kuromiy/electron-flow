import { z } from "zod";
import type { Context } from "../context.js";

export const schema = z.object({
    resourceId: z.string(),
    rawTags: z.string(),
    authorId: z.string().optional(),
});
export type Request = z.infer<typeof schema>;

export async function execute(ctx: Context, req: Request) {

}