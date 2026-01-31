// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure, unknownError } from "electron-flow";

import { included } from "../../../fixture/009-ignores/input/apis/sample.js";

export const autoGenerateHandlers = {
    "included": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, _: unknown) => {
            try {
                const result = await included({ ...ctx, event });
                return success(result);
            } catch (e) {
                return failure(unknownError(e));
            }
        };
    },
};
