// auto generated
import type { Context } from "../../../fixture/input/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";

import { ping } from "../../../fixture/input/apis2/sample2.js";

export const autoGenerateHandlers = {
    "ping": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, _: unknown) => {
            try {
                const result = await ping({ ...ctx, event });
                return success(result);
            } catch (e) {
                return failure(e);
            }
        };
    },
};
