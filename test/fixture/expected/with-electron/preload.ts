// auto generated
import { ipcRenderer } from "electron";

export default {
    showDialog: (title: string, message: string) => ipcRenderer.invoke("showDialog", { title, message })
};
