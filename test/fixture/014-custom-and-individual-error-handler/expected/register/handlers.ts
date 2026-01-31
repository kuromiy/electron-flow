// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure, unknownError } from "electron-flow";
import { handleError } from "../../../fixture/_shared/error-handler.js";

import { processData, saveData, saveDataErrorHandler } from "../../../fixture/014-custom-and-individual-error-handler/input/apis/sample.js";

export const autoGenerateHandlers = {
    "processData": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await processData({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                try {
                    return failure(handleError(e, { ...ctx, event }));
                } catch (handlerError) {
                    return failure(unknownError(e));
                }
            }
        };
    },
    "saveData": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await saveData({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                try {
                    const individualResult = saveDataErrorHandler(e, { ...ctx, event });
                    if (individualResult !== null) {
                        return failure(individualResult);
                    }
                    return failure(handleError(e, { ...ctx, event }));
                } catch (handlerError) {
                    return failure(unknownError(e));
                }
            }
        };
    },
};
