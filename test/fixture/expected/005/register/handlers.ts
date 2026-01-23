// auto generated
import type { Context } from "../../../fixture/input/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";

import { execute } from "../../../fixture/input/apis3/sample3.js";

export const autoGenerateHandlers = {
    "execute": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await execute({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return failure(e);
            }
        };
    },
};
