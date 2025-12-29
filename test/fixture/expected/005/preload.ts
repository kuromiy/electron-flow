// auto generated
import { ipcRenderer } from "electron";

export default {
    execute: (page: number, limit: number, searchQuery: string | undefined, sortKey: "createdAt" | "updatedAt" | "serviceName", sortOrder: "asc" | "desc") => ipcRenderer.invoke("execute", { page, limit, searchQuery, sortKey, sortOrder })
};
