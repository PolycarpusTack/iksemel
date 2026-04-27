import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "./api";

const api: ElectronAPI = {
  connections: {
    testConnection: (profile) =>
      ipcRenderer.invoke("connections:testConnection", profile),
    connect: (profileId) =>
      ipcRenderer.invoke("connections:connect", profileId),
    disconnect: (connectionId) =>
      ipcRenderer.invoke("connections:disconnect", connectionId),
    listProfiles: () =>
      ipcRenderer.invoke("connections:listProfiles"),
    saveProfile: (profile) =>
      ipcRenderer.invoke("connections:saveProfile", profile),
    deleteProfile: (profileId) =>
      ipcRenderer.invoke("connections:deleteProfile", profileId),
    setFavourite: (profileId, favourite) =>
      ipcRenderer.invoke("connections:setFavourite", profileId, favourite),
  },
  schema: {
    getTables: (connectionId) =>
      ipcRenderer.invoke("schema:getTables", connectionId),
    getColumns: (connectionId, tableId) =>
      ipcRenderer.invoke("schema:getColumns", connectionId, tableId),
    getForeignKeys: (connectionId) =>
      ipcRenderer.invoke("schema:getForeignKeys", connectionId),
    buildSchemaTree: (connectionId, options) =>
      ipcRenderer.invoke("schema:buildSchemaTree", connectionId, options),
  },
  stats: {
    fetchSampleStats: (connectionId, columns) =>
      ipcRenderer.invoke("stats:fetchSampleStats", connectionId, columns),
    fetchCardinality: (connectionId, tableId) =>
      ipcRenderer.invoke("stats:fetchCardinality", connectionId, tableId),
    getRowCount: (connectionId, tableId) =>
      ipcRenderer.invoke("stats:getRowCount", connectionId, tableId),
  },
  files: {
    chooseOutputDir: () =>
      ipcRenderer.invoke("files:chooseOutputDir"),
    savePackage: (files, outputDir) =>
      ipcRenderer.invoke("files:savePackage", files, outputDir),
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
