// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure, unknownError } from "electron-flow";

import { updateItem } from "../../../fixture/006-optional-props/input/apis/sample.js";

export const autoGenerateHandlers = {
    "updateItem": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await updateItem({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return failure(unknownError(e));
            }
        };
    },
};
