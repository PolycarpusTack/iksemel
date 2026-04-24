import type { ElectronAPI } from "../electron/preload/api";

declare global {
  interface Window {
    readonly electronAPI?: ElectronAPI;
  }
}

export {};
