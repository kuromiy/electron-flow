// auto generated
import { ipcRenderer } from "electron";

export default {
    createUser: (username: string, email: string, age: number) => ipcRenderer.invoke("createUser", { username, email, age })
};
