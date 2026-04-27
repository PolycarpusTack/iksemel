// electron/main/ipc/files.ts
import type { IpcMain } from "electron";
import { dialog } from "electron";
import * as fs from "fs";
import * as path from "path";
import type { PackageFiles, SaveResult } from "../../preload/api";

export function registerFilesHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("files:chooseOutputDir", async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "Choose output folder",
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    "files:savePackage",
    async (_event, files: PackageFiles, outputDir: string): Promise<SaveResult> => {
      const resolvedBase = path.resolve(outputDir);
      await fs.promises.mkdir(resolvedBase, { recursive: true });
      const savedPaths: string[] = [];
      for (const [filename, content] of Object.entries(files)) {
        const filePath = path.resolve(resolvedBase, filename);
        if (!filePath.startsWith(resolvedBase + path.sep)) {
          throw new Error(`Rejected unsafe filename: ${filename}`);
        }
        await fs.promises.writeFile(filePath, content, "utf8");
        savedPaths.push(filePath);
      }
      return { savedPaths, outputDir };
    },
  );
}
