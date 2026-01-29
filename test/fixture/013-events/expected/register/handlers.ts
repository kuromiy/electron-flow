// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";

import { ping } from "../../../fixture/013-events/input/apis/sample.js";

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
