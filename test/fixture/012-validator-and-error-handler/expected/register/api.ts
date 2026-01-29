// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import { ipcMain } from "electron";
import { autoGenerateHandlers } from "./handlers.js";

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
