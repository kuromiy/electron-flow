import { z } from "zod";
import type { Context } from "../context.js";
import { createUserSchema, updateUserSchema } from "./schemas/user-schema.js";

export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;

export async function createUser(ctx: Context, req: CreateUserRequest) {
	// ユーザー作成ロジック
	return { success: true, userId: "123" };
}

export async function updateUser(ctx: Context, req: UpdateUserRequest) {
	// ユーザー更新ロジック
	return { success: true };
}
