import type { Context } from "../../../_shared/context.js";

// Zodスキーマの代わりにシンプルな型定義を使用
// 実際にはz.infer<typeof createUserSchema>のような形で使う
type CreateUserRequest = {
	username: string;
	email: string;
	age: number;
};

export async function createUser(
	ctx: Context,
	req: CreateUserRequest,
): Promise<{ id: string; username: string }> {
	return { id: "new-user", username: req.username };
}
