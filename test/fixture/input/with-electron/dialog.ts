import { dialog } from "electron";
import { z } from "zod";
import type { Context } from "../context.js";

// Electronのdialogを使用する最小限のスキーマ
export const dialogSchema = z.object({
	title: z.string(),
	message: z.string(),
});

export type DialogRequest = z.infer<typeof dialogSchema>;

// Electronのdialogを使用する関数
export async function showDialog(ctx: Context, req: DialogRequest) {
	// TODO: 下記コメントアウトを外すと期待値と異なる。
	await dialog.showOpenDialog({ properties: ['openFile'] });
	// 実際のElectron環境では動作するが、
	// Node.js環境での動的インポートではエラーになるはずのコード
	// しかし、フォールバック処理により継続される
	return { title: req.title, message: req.message };
}