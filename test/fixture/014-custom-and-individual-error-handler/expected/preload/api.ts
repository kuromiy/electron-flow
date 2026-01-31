// auto generated
import { ipcRenderer } from "electron";

export default {
    processData: (data: string) => ipcRenderer.invoke("processData", { data }),
    saveData: (data: string) => ipcRenderer.invoke("saveData", { data })
};
