// auto generated
import { ipcRenderer } from "electron";

export default {
    execute: (resourceId: string, rawTags: string, authorId: string | undefined) => ipcRenderer.invoke("execute", { resourceId, rawTags, authorId })
};
