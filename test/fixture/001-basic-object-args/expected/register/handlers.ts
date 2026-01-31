// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure, unknownError } from "electron-flow";

import { execute } from "../../../fixture/001-basic-object-args/input/apis/sample.js";

export const autoGenerateHandlers = {
    "execute": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await execute({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return failure(unknownError(e));
            }
        };
    },
};
