// auto generated
import { ipcRenderer } from "electron";

export default {
    updateRecord: (id: string, value: number) => ipcRenderer.invoke("updateRecord", { id, value })
};
