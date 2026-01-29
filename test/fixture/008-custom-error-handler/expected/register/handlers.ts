// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";
import { handleError } from "../../../fixture/_shared/error-handler.js";

import { processData } from "../../../fixture/008-custom-error-handler/input/apis/sample.js";

export const autoGenerateHandlers = {
    "processData": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await processData({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return handleError(e, { ...ctx, event });
            }
        };
    },
};
