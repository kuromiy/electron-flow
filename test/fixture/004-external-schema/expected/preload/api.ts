// auto generated
import { ipcRenderer } from "electron";

export default {
    getUser: (userId: string, email: string) => ipcRenderer.invoke("getUser", { userId, email })
};
