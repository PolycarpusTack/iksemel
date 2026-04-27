// electron/main/ipc/schema.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetTables, mockGetColumns, mockGetForeignKeys } = vi.hoisted(() => {
  const mockGetTables = vi.fn().mockResolvedValue([
    { tableId: "public.programme", schema: "public", name: "programme", type: "TABLE" },
  ]);
  const mockGetColumns = vi.fn().mockResolvedValue([
    { columnId: "c1", tableId: "public.programme", name: "id", dbType: "INTEGER", nullable: false, isPrimaryKey: true },
  ]);
  const mockGetForeignKeys = vi.fn().mockResolvedValue([]);
  return { mockGetTables, mockGetColumns, mockGetForeignKeys };
});

vi.mock("./connections", () => ({
  getDriver: vi.fn().mockReturnValue({
    getTables: mockGetTables,
    getColumns: mockGetColumns,
    getForeignKeys: mockGetForeignKeys,
    constructor: { name: "PgDriver" },
  }),
}));

import { registerSchemaHandlers } from "./schema";

function makeIpcMain() {
  const handlers: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  return {
    handle: vi.fn((channel: string, fn: (...args: unknown[]) => Promise<unknown>) => {
      handlers[channel] = fn;
    }),
    _invoke: async (channel: string, ...args: unknown[]) => {
      const fn = handlers[channel];
      if (!fn) throw new Error(`No handler for ${channel}`);
      return fn({}, ...args);
    },
  };
}

describe("registerSchemaHandlers", () => {
  let ipcMain: ReturnType<typeof makeIpcMain>;

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain = makeIpcMain();
    registerSchemaHandlers(ipcMain as any);
  });

  it("registers 4 channels", () => {
    const channels = ipcMain.handle.mock.calls.map((c) => c[0]);
    expect(channels).toContain("schema:getTables");
    expect(channels).toContain("schema:getColumns");
    expect(channels).toContain("schema:getForeignKeys");
    expect(channels).toContain("schema:buildSchemaTree");
  });

  it("getTables delegates to driver.getTables", async () => {
    const result = await ipcMain._invoke("schema:getTables", "conn-1");
    expect(mockGetTables).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
  });

  it("getColumns delegates to driver.getColumns", async () => {
    const result = await ipcMain._invoke("schema:getColumns", "conn-1", "public.programme") as unknown[];
    expect(mockGetColumns).toHaveBeenCalledWith("public.programme");
    expect(result).toHaveLength(1);
  });

  it("getForeignKeys delegates to driver.getForeignKeys", async () => {
    const result = await ipcMain._invoke("schema:getForeignKeys", "conn-1");
    expect(mockGetForeignKeys).toHaveBeenCalledOnce();
    expect(result).toEqual([]);
  });

  it("buildSchemaTree returns SchemaNode[] from driver data", async () => {
    const options = {
      selectedTableIds: ["public.programme"],
      fkDecisions: {},
      includeViews: false,
      maxSelfRefDepth: 3,
    };
    const result = await ipcMain._invoke("schema:buildSchemaTree", "conn-1", options) as unknown[];
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});
