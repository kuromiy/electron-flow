// auto generated
import { ipcRenderer } from "electron";

export default {
    execute: (id: string, name: string) => ipcRenderer.invoke("execute", { id, name })
};
