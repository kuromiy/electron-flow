// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure, unknownError } from "electron-flow";

import { createItem, validateCreateItem } from "../../../fixture/010-validator-config/input/apis/sample.js";

export const autoGenerateHandlers = {
    "createItem": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: unknown) => {
            try {
                const validatedArgs = validateCreateItem(args, { ...ctx, event });
                const result = await createItem({ ...ctx, event }, validatedArgs);
                return success(result);
            } catch (e) {
                return failure(unknownError(e));
            }
        };
    },
};
