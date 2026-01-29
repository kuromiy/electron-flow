// auto generated
import { ipcRenderer } from "electron";

import type { ErrorMessage, SuccessMessage } from "../../fixture/013-events/input/events/notification.js";

export default {
    onError: (cb: (value: ErrorMessage) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, value: ErrorMessage) => {
            cb(value);
        };
        ipcRenderer.on("onError", handler);
        return () => {
            ipcRenderer.off("onError", handler);
        };
    },
    onSuccess: (cb: (value: SuccessMessage) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, value: SuccessMessage) => {
            cb(value);
        };
        ipcRenderer.on("onSuccess", handler);
        return () => {
            ipcRenderer.off("onSuccess", handler);
        };
    }
};
