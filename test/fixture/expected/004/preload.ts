// auto generated
import { ipcRenderer } from "electron";

export default {
    createUser: (name: string, email: string, age: number | undefined) => ipcRenderer.invoke("createUser", { name, email, age }),
    updateUser: (userId: string, name: string | undefined, email: string | undefined) => ipcRenderer.invoke("updateUser", { userId, name, email })
};
