// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";

import { saveData, saveDataErrorHandler } from "../../../fixture/011-error-handler-config/input/apis/sample.js";

export const autoGenerateHandlers = {
    "saveData": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await saveData({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                const individualResult = saveDataErrorHandler(e, { ...ctx, event });
                if (individualResult !== null) {
                    return failure(individualResult);
                }
                return failure(e);
            }
        };
    },
};
