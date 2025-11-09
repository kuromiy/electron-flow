import { z } from "zod";

export const createUserSchema = z.object({
	name: z.string(),
	email: z.string().email(),
	age: z.number().optional(),
});

export const updateUserSchema = z.object({
	userId: z.string(),
	name: z.string().optional(),
	email: z.string().email().optional(),
});
