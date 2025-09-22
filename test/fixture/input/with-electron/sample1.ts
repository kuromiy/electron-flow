import { z } from "zod";
import type { Context } from "../context.js";
import { dialog } from "electron";

export const schema = z.object({
    resourceId: z.string(),
    rawTags: z.string(),
    authorId: z.string().optional(),
});
export type Request = z.infer<typeof schema>;

export async function execute(ctx: Context, req: Request) {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
    if (canceled || filePaths.length === 0) {
        throw new Error("No file selected");
    }
    console.log("Selected file:", filePaths[0]);
}