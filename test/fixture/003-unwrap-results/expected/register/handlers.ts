// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure, unknownError } from "electron-flow";

import { getData } from "../../../fixture/003-unwrap-results/input/apis/sample.js";

export const autoGenerateHandlers = {
    "getData": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await getData({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return failure(unknownError(e));
            }
        };
    },
};
