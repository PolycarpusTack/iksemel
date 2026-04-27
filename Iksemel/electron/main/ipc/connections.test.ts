// electron/main/ipc/connections.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockConnect, mockDisconnect } = vi.hoisted(() => {
  const mockConnect = vi.fn().mockResolvedValue(undefined);
  const mockDisconnect = vi.fn().mockResolvedValue(undefined);
  return { mockConnect, mockDisconnect };
});

// Mock profiles module
vi.mock("../profiles", () => ({
  loadProfiles: vi.fn().mockResolvedValue([]),
  saveProfile: vi.fn().mockResolvedValue({ id: "p1", label: "Test", engine: "postgres", host: "localhost", port: 5432, database: "db", username: "u", schemas: ["public"], createdAt: 1000 }),
  deleteProfile: vi.fn().mockResolvedValue(undefined),
  setFavourite: vi.fn().mockResolvedValue(undefined),
  getPassword: vi.fn().mockResolvedValue("secret"),
}));

// Mock PgDriver
vi.mock("../db/pg-driver", () => ({
  PgDriver: vi.fn().mockImplementation(() => ({ connect: mockConnect, disconnect: mockDisconnect })),
}));

vi.mock("../db/oracle-driver", () => ({
  OracleDriver: vi.fn().mockImplementation(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
}));

import { registerConnectionHandlers } from "./connections";

// Minimal ipcMain mock
function makeIpcMain() {
  const handlers: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  return {
    handle: vi.fn((channel: string, fn: (...args: unknown[]) => Promise<unknown>) => {
      handlers[channel] = fn;
    }),
    _invoke: async (channel: string, ...args: unknown[]) => {
      const fn = handlers[channel];
      if (!fn) throw new Error(`No handler for ${channel}`);
      return fn({}, ...args); // first arg is IpcMainInvokeEvent (mocked as {})
    },
  };
}

describe("registerConnectionHandlers", () => {
  let ipcMain: ReturnType<typeof makeIpcMain>;

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain = makeIpcMain();
    registerConnectionHandlers(ipcMain as any);
  });

  it("registers all 7 channels", () => {
    const channels = ipcMain.handle.mock.calls.map((c) => c[0]);
    expect(channels).toContain("connections:testConnection");
    expect(channels).toContain("connections:connect");
    expect(channels).toContain("connections:disconnect");
    expect(channels).toContain("connections:listProfiles");
    expect(channels).toContain("connections:saveProfile");
    expect(channels).toContain("connections:deleteProfile");
    expect(channels).toContain("connections:setFavourite");
  });

  it("listProfiles calls loadProfiles and returns result", async () => {
    const { loadProfiles } = await import("../profiles");
    (loadProfiles as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "p1", label: "Local PG", engine: "postgres", host: "localhost", port: 5432, database: "db", username: "u", schemas: ["public"], createdAt: 1000 },
    ]);
    const result = await ipcMain._invoke("connections:listProfiles");
    expect(result).toHaveLength(1);
  });

  it("connect stores driver in registry and returns connectionId", async () => {
    const { loadProfiles, getPassword } = await import("../profiles");
    (loadProfiles as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", label: "Test", engine: "postgres", host: "localhost", port: 5432, database: "db", username: "u", schemas: ["public"], createdAt: 1000 },
    ]);
    (getPassword as ReturnType<typeof vi.fn>).mockResolvedValue("secret");

    const result = await ipcMain._invoke("connections:connect", "p1") as { connectionId: string };
    expect(result.connectionId).toBeTruthy();
    expect(mockConnect).toHaveBeenCalledOnce();
  });

  it("disconnect throws if connectionId unknown", async () => {
    await expect(ipcMain._invoke("connections:disconnect", "unknown-id")).rejects.toThrow();
  });

  it("testConnection returns success on connect success", async () => {
    const result = await ipcMain._invoke("connections:testConnection", {
      engine: "postgres",
      host: "localhost",
      port: 5432,
      database: "db",
      username: "u",
      password: "pw",
      schemas: ["public"],
    }) as { success: boolean };
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("latencyMs");
  });

  it("testConnection returns failure on connect error", async () => {
    mockConnect.mockRejectedValueOnce(new Error("auth failed"));
    const result = await ipcMain._invoke("connections:testConnection", {
      engine: "postgres",
      host: "localhost",
      port: 5432,
      database: "db",
      username: "u",
      password: "pw",
      schemas: ["public"],
    }) as { success: boolean; error: string };
    expect(result.success).toBe(false);
    expect(result.error).toContain("auth failed");
  });
});
