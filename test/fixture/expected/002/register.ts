// auto generated
import type { Context } from "../../fixture/input/context.js";
import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";

import { ping } from "../../fixture/input/apis2/sample2.js";

export const autoGenerateHandlers = {
    "ping": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, _: unknown) => {
            try {
                const result = await ping({ ...ctx, event }, );
                return success(result);
            } catch (e) {
                return failure(e);
            }
        };
    },
};

export function registerAutoGenerateAPI(ctx: Omit<Context, "event">) {
    Object.entries(autoGenerateHandlers).forEach(([key, value]) => {
        ipcMain.handle(key, value(ctx));
    });
}

export function removeAutoGenerateAPI() {
    Object.keys(autoGenerateHandlers).forEach(key => {
        ipcMain.removeHandler(key);
    });
}
