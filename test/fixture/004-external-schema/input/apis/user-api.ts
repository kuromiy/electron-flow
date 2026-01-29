import type { Context } from "../../../_shared/context.js";
import type { UserRequest, UserResponse } from "./schemas/user-schema.js";

export async function getUser(
	ctx: Context,
	req: UserRequest,
): Promise<UserResponse> {
	return {
		id: req.userId,
		name: `User-${ctx.userId}`,
		email: req.email,
	};
}
