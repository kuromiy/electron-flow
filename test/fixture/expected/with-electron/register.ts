// auto generated
import type { Context } from "../../fixture/input/context.js";
import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";

import { showDialog } from "../../fixture/input/with-electron/dialog.js";

export const autoGenerateHandlers = {
    "showDialog": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: unknown) => {
            try {
                const result = await showDialog({ ...ctx, event }, args);
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
