import { contextBridge } from "electron";
import type { ElectronAPI } from "./api";

const api: ElectronAPI = {};

contextBridge.exposeInMainWorld("electronAPI", api);
