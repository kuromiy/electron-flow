// auto generated
import type { Context } from "../../fixture/input/context.js";
import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";

import { createUser, updateUser } from "../../fixture/input/apis-with-external-schema/user-api.js";

export const autoGenerateHandlers = {
    "createUser": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await createUser({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return failure(e);
            }
        };
    },
    "updateUser": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await updateUser({ ...ctx, event }, args);
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
