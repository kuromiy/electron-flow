// auto generated
import { ipcRenderer } from "electron";

export default {
    execute: (page: number, limit: number, sortKey: "createdAt" | "updatedAt" | "serviceName", sortOrder: "asc" | "desc", searchQuery: string | undefined) => ipcRenderer.invoke("execute", { page, limit, sortKey, sortOrder, searchQuery })
};
