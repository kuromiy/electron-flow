// auto generated
import { ipcRenderer } from "electron";

export default {
    processData: (data: string) => ipcRenderer.invoke("processData", { data })
};
