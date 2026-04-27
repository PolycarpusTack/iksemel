// electron/main/ipc/stats.ts
import type { IpcMain } from "electron";
import { getDriver } from "./connections";
import type { FieldSampleData, CardinalityStats } from "../../preload/api";

const STATS_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

export function registerStatsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    "stats:fetchSampleStats",
    async (_event, connectionId: string, columns: string[]): Promise<FieldSampleData[]> => {
      const driver = getDriver(connectionId);
      return withTimeout(driver.fetchSampleStats(columns), STATS_TIMEOUT_MS, []);
    },
  );

  ipcMain.handle(
    "stats:fetchCardinality",
    async (_event, connectionId: string, tableId: string): Promise<CardinalityStats> => {
      const driver = getDriver(connectionId);
      const fallback: CardinalityStats = {
        elementPath: tableId,
        avgCount: 0,
        minCount: 0,
        maxCount: 0,
        sampleSize: 0,
      };
      return withTimeout(driver.fetchCardinality(tableId), STATS_TIMEOUT_MS, fallback);
    },
  );

  ipcMain.handle(
    "stats:getRowCount",
    async (_event, connectionId: string, tableId: string): Promise<number> => {
      const driver = getDriver(connectionId);
      return withTimeout(driver.getRowCount(tableId), STATS_TIMEOUT_MS, 0);
    },
  );
}
