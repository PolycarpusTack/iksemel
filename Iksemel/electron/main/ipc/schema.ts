// electron/main/ipc/schema.ts
import type { IpcMain } from "electron";
import { getDriver } from "./connections";
import { buildSchemaTree } from "../db/schema-builder";
import type { SchemaTreeOptions, SchemaNode, DbEngine } from "../../preload/api";

export function registerSchemaHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    "schema:getTables",
    async (_event, connectionId: string) => {
      const driver = getDriver(connectionId);
      return driver.getTables();
    },
  );

  ipcMain.handle(
    "schema:getColumns",
    async (_event, connectionId: string, tableId: string) => {
      const driver = getDriver(connectionId);
      return driver.getColumns(tableId);
    },
  );

  ipcMain.handle(
    "schema:getForeignKeys",
    async (_event, connectionId: string) => {
      const driver = getDriver(connectionId);
      return driver.getForeignKeys();
    },
  );

  ipcMain.handle(
    "schema:buildSchemaTree",
    async (_event, connectionId: string, options: SchemaTreeOptions): Promise<SchemaNode[]> => {
      const driver = getDriver(connectionId);

      // Fetch tables and foreign keys in parallel
      const [tables, fks] = await Promise.all([
        driver.getTables(),
        driver.getForeignKeys(),
      ]);

      // Fetch columns for each selected table in parallel
      const columnsMap = new Map<string, Awaited<ReturnType<typeof driver.getColumns>>>();
      await Promise.all(
        options.selectedTableIds.map(async (tableId) => {
          const cols = await driver.getColumns(tableId);
          columnsMap.set(tableId, cols);
        }),
      );

      const engine: DbEngine = driver.engine;

      return buildSchemaTree(tables, columnsMap, fks, options, engine);
    },
  );
}
