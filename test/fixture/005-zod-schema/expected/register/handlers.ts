// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";

import { createUser } from "../../../fixture/005-zod-schema/input/apis/sample.js";

export const autoGenerateHandlers = {
    "createUser": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await createUser({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return failure(e);
            }
        };
    },
};
