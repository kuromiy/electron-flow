// auto generated
import type { Context } from "../../../fixture/_shared/context.js";
import type { IpcMainInvokeEvent } from "electron";
import { success, failure } from "electron-flow";

import { alpha, beta } from "../../../fixture/007-multiple-files/input/apis/file1.js";
import { gamma } from "../../../fixture/007-multiple-files/input/apis/file2.js";

export const autoGenerateHandlers = {
    "alpha": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, _: unknown) => {
            try {
                const result = await alpha({ ...ctx, event });
                return success(result);
            } catch (e) {
                return failure(e);
            }
        };
    },
    "beta": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await beta({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return failure(e);
            }
        };
    },
    "gamma": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await gamma({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return failure(e);
            }
        };
    },
};
