import type { Context } from "../../../fixture/_shared/context.js";

// exportされていない関数のみ（処理対象にならない）
async function _privateFunction(_ctx: Context): Promise<string> {
	return "private";
}

function _anotherPrivate(_ctx: Context, req: { id: string }): void {
	console.log(req.id);
}
