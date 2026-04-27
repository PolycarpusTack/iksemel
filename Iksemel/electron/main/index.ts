// electron/main/index.ts
import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { registerConnectionHandlers } from "./ipc/connections";
import { registerSchemaHandlers } from "./ipc/schema";
import { registerStatsHandlers } from "./ipc/stats";
import { registerFilesHandlers } from "./ipc/files";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "XML Filter & Export Builder",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.on("ready-to-show", () => {
    win.show();
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  // Register all IPC handlers before creating the window
  registerConnectionHandlers(ipcMain);
  registerSchemaHandlers(ipcMain);
  registerStatsHandlers(ipcMain);
  registerFilesHandlers(ipcMain);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
