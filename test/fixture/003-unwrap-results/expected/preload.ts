// auto generated
import { ipcRenderer } from "electron";

export default {
    getData: (id: string) => ipcRenderer.invoke("getData", { id })
};
