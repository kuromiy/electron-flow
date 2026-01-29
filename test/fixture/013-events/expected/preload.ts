// auto generated
import { ipcRenderer } from "electron";

export default {
    ping: () => ipcRenderer.invoke("ping", {  })
};
