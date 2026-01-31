// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure, unknownError } from "electron-flow";

import { getUser } from "../../../fixture/004-external-schema/input/apis/user-api.js";

export const autoGenerateHandlers = {
    "getUser": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await getUser({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return failure(unknownError(e));
            }
        };
    },
};
