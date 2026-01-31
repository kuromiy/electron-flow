// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";

import { updateRecord, validateUpdateRecord, updateRecordErrorHandler } from "../../../fixture/012-validator-and-error-handler/input/apis/sample.js";

export const autoGenerateHandlers = {
    "updateRecord": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: unknown) => {
            try {
                const validatedArgs = validateUpdateRecord(args, { ...ctx, event });
                const result = await updateRecord({ ...ctx, event }, validatedArgs);
                return success(result);
            } catch (e) {
                try {
                    const individualResult = updateRecordErrorHandler(e, { ...ctx, event });
                    if (individualResult !== null) {
                        return failure(individualResult);
                    }
                    return failure(e);
                } catch (handlerError) {
                    return failure(e);
                }
            }
        };
    },
};
