/**
 * テスト用サンプルAPIファイル
 * parse.tsとzod.tsの動作確認用
 */

import { z } from 'zod';

// Zodスキーマの定義
export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(120).optional(),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

// 型の定義
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;

// Context型（サンプル）
interface Context {
  event: any;
  db: any;
  user?: any;
}

/**
 * ユーザーを作成する関数
 * @param ctx - コンテキスト
 * @param request - 作成リクエスト
 * @returns 作成されたユーザー
 */
export async function createUser(ctx: Context, request: CreateUserRequest): Promise<{ id: string; name: string; email: string }> {
  const user = await ctx.db.users.create({
    data: request
  });
  return user;
}

/**
 * ユーザーを更新する関数
 */
export async function updateUser(ctx: Context, request: UpdateUserRequest): Promise<void> {
  await ctx.db.users.update({
    where: { id: request.id },
    data: request
  });
}

/**
 * すべてのユーザーを取得する関数
 */
export function getAllUsers(ctx: Context): Promise<Array<{ id: string; name: string; email: string }>> {
  return ctx.db.users.findMany();
}

/**
 * 内部関数（エクスポートされない）
 */
function internalHelper(): string {
  return 'helper';
}

// 定数のエクスポート
export const API_VERSION = '1.0.0';

// アロー関数のエクスポート
export const arrowFunction = (data: string): string => {
  return data.toUpperCase();
};

// 非同期アロー関数
export const asyncArrowFunction = async (id: string): Promise<string> => {
  return `processed-${id}`;
};