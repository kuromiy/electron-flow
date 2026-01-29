// auto generated
import { ipcRenderer } from "electron";

export default {
    alpha: () => ipcRenderer.invoke("alpha", {  }),
    beta: (value: number) => ipcRenderer.invoke("beta", { value }),
    gamma: (name: string) => ipcRenderer.invoke("gamma", { name })
};
