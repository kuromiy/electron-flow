// auto generated
import { ipcRenderer } from "electron";

export default {
    updateItem: (id: string, name: string | undefined, description: string | undefined) => ipcRenderer.invoke("updateItem", { id, name, description })
};
