// auto generated
import { ipcRenderer } from "electron";

export default {
    createItem: (name: string, price: number) => ipcRenderer.invoke("createItem", { name, price })
};
