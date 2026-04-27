// electron/main/ipc/stats.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFetchSampleStats, mockFetchCardinality, mockGetRowCount } = vi.hoisted(() => {
  const mockFetchSampleStats = vi.fn().mockResolvedValue([]);
  const mockFetchCardinality = vi.fn().mockResolvedValue({ elementPath: "t", avgCount: 10, minCount: 0, maxCount: 100, sampleSize: 1000 });
  const mockGetRowCount = vi.fn().mockResolvedValue(42);
  return { mockFetchSampleStats, mockFetchCardinality, mockGetRowCount };
});

vi.mock("./connections", () => ({
  getDriver: vi.fn().mockReturnValue({
    fetchSampleStats: mockFetchSampleStats,
    fetchCardinality: mockFetchCardinality,
    getRowCount: mockGetRowCount,
  }),
}));

import { registerStatsHandlers } from "./stats";

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

describe("registerStatsHandlers", () => {
  let ipcMain: ReturnType<typeof makeIpcMain>;

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain = makeIpcMain();
    registerStatsHandlers(ipcMain as any);
  });

  it("registers 3 channels", () => {
    const channels = ipcMain.handle.mock.calls.map((c) => c[0]);
    expect(channels).toContain("stats:fetchSampleStats");
    expect(channels).toContain("stats:fetchCardinality");
    expect(channels).toContain("stats:getRowCount");
  });

  it("fetchSampleStats delegates to driver", async () => {
    mockFetchSampleStats.mockResolvedValueOnce([
      { fieldId: "c", fieldPath: "c", values: [], totalCount: 10, distinctCount: 5, nullCount: 0 },
    ]);
    const result = await ipcMain._invoke("stats:fetchSampleStats", "conn-1", ["public.t.col"]) as unknown[];
    expect(mockFetchSampleStats).toHaveBeenCalledWith(["public.t.col"]);
    expect(result).toHaveLength(1);
  });

  it("fetchCardinality delegates to driver", async () => {
    const result = await ipcMain._invoke("stats:fetchCardinality", "conn-1", "public.t") as Record<string, unknown>;
    expect(mockFetchCardinality).toHaveBeenCalledWith("public.t");
    expect(result.avgCount).toBe(10);
  });

  it("getRowCount delegates to driver", async () => {
    const result = await ipcMain._invoke("stats:getRowCount", "conn-1", "public.t");
    expect(result).toBe(42);
  });

  it("fetchSampleStats returns empty array on timeout (5s)", async () => {
    vi.useFakeTimers();
    mockFetchSampleStats.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 10000)),
    );
    const promise = ipcMain._invoke("stats:fetchSampleStats", "conn-1", ["col"]);
    vi.advanceTimersByTime(5001);
    const result = await promise as unknown[];
    expect(result).toEqual([]);
    vi.useRealTimers();
  });
});
