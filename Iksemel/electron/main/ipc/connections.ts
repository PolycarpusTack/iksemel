// electron/main/ipc/connections.ts
import type { IpcMain } from "electron";
import { PgDriver } from "../db/pg-driver";
import { OracleDriver } from "../db/oracle-driver";
import {
  loadProfiles,
  saveProfile,
  deleteProfile,
  setFavourite,
  getPassword,
} from "../profiles";
import type { ConnectionProfileInput, ConnectionResult, TestResult } from "../../preload/api";
import * as crypto from "crypto";

// In-memory registry: connectionId → driver instance
const registry = new Map<string, PgDriver | OracleDriver>();

export function registerConnectionHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    "connections:testConnection",
    async (_event, profile: ConnectionProfileInput): Promise<TestResult> => {
      const driver = profile.engine === "postgres" ? new PgDriver() : new OracleDriver();
      const start = Date.now();
      try {
        await driver.connect(profile);
        await driver.disconnect();
        return { success: true, latencyMs: Date.now() - start };
      } catch (err: unknown) {
        return {
          success: false,
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  );

  ipcMain.handle(
    "connections:connect",
    async (_event, profileId: string): Promise<ConnectionResult> => {
      const profiles = await loadProfiles();
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) throw new Error(`Profile not found: ${profileId}`);

      const password = await getPassword(profileId);
      const fullProfile: ConnectionProfileInput = { ...profile, password };

      const driver = profile.engine === "postgres" ? new PgDriver() : new OracleDriver();
      await driver.connect(fullProfile);

      const connectionId = crypto.randomUUID();
      registry.set(connectionId, driver);

      return { connectionId, engine: profile.engine, profileId };
    },
  );

  ipcMain.handle(
    "connections:disconnect",
    async (_event, connectionId: string): Promise<void> => {
      const driver = registry.get(connectionId);
      if (!driver) throw new Error(`Connection not found: ${connectionId}`);
      try {
        await driver.disconnect();
      } finally {
        registry.delete(connectionId);
      }
    },
  );

  ipcMain.handle("connections:listProfiles", async (): Promise<Awaited<ReturnType<typeof loadProfiles>>> => {
    return loadProfiles();
  });

  ipcMain.handle(
    "connections:saveProfile",
    async (_event, profile: ConnectionProfileInput) => {
      return saveProfile(profile);
    },
  );

  ipcMain.handle(
    "connections:deleteProfile",
    async (_event, profileId: string): Promise<void> => {
      await deleteProfile(profileId);
    },
  );

  ipcMain.handle(
    "connections:setFavourite",
    async (_event, profileId: string, favourite: boolean): Promise<void> => {
      await setFavourite(profileId, favourite);
    },
  );
}

/** Exported for use by other IPC handlers that need to resolve a connection */
export function getDriver(connectionId: string): PgDriver | OracleDriver {
  const driver = registry.get(connectionId);
  if (!driver) throw new Error(`Connection not found: ${connectionId}`);
  return driver;
}
