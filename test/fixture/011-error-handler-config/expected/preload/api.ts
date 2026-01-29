// auto generated
import { ipcRenderer } from "electron";

export default {
    saveData: (data: string) => ipcRenderer.invoke("saveData", { data })
};
