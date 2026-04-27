// src/engine/provider/database-provider.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DatabaseProvider } from "./database-provider";

const mockFetchSampleStats = vi.fn();
const mockFetchCardinality = vi.fn();
const mockGetRowCount = vi.fn();

function setupElectronAPI() {
  Object.defineProperty(window, "electronAPI", {
    value: {
      stats: {
        fetchSampleStats: mockFetchSampleStats,
        fetchCardinality: mockFetchCardinality,
        getRowCount: mockGetRowCount,
      },
    },
    configurable: true,
    writable: true,
  });
}

function removeElectronAPI() {
  Object.defineProperty(window, "electronAPI", {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

describe("DatabaseProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupElectronAPI();
  });

  afterEach(() => {
    removeElectronAPI();
  });

  describe("isAvailable()", () => {
    it("returns true when window.electronAPI is defined", () => {
      const provider = new DatabaseProvider("conn-1", new Map());
      expect(provider.isAvailable()).toBe(true);
    });

    it("returns false when window.electronAPI is absent", () => {
      removeElectronAPI();
      const provider = new DatabaseProvider("conn-1", new Map());
      expect(provider.isAvailable()).toBe(false);
    });
  });

  it("source is 'api'", () => {
    const provider = new DatabaseProvider("conn-1", new Map());
    expect(provider.source).toBe("api");
  });

  describe("fetchSampleData()", () => {
    it("groups field paths by table and calls fetchSampleStats per table", async () => {
      const tableMapping = new Map([
        ["programme.", "public.programme"],
        ["genre.", "public.genre"],
      ]);

      mockFetchSampleStats.mockResolvedValue([
        {
          fieldId: "public.programme.title",
          fieldPath: "public.programme.title",
          values: [{ value: "BBC News", count: 100 }],
          totalCount: 500,
          distinctCount: 200,
          nullCount: 0,
        },
      ]);

      const provider = new DatabaseProvider("conn-1", tableMapping);
      const result = await provider.fetchSampleData(["programme.title"]);

      expect(mockFetchSampleStats).toHaveBeenCalledWith(
        "conn-1",
        expect.arrayContaining(["public.programme.title"]),
      );
      expect(result.source).toBe("api");
      expect(result.fields).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(result.fields[0]!.fieldPath).toBe("public.programme.title");
      expect(result.fetchedAt).toBeGreaterThan(0);
    });

    it("returns empty fields when electronAPI is unavailable", async () => {
      removeElectronAPI();
      const provider = new DatabaseProvider("conn-1", new Map());
      const result = await provider.fetchSampleData(["some.field"]);
      expect(result.fields).toHaveLength(0);
      expect(result.cardinality).toHaveLength(0);
    });

    it("returns empty cardinality array (fetchCardinality is separate)", async () => {
      mockFetchSampleStats.mockResolvedValue([]);
      const provider = new DatabaseProvider("conn-1", new Map([["t.", "public.t"]]));
      const result = await provider.fetchSampleData(["t.col"]);
      expect(result.cardinality).toEqual([]);
    });
  });

  describe("fetchCardinality()", () => {
    it("calls fetchCardinality for each element path's table", async () => {
      const tableMapping = new Map([["programme.", "public.programme"]]);
      mockFetchCardinality.mockResolvedValue({
        elementPath: "public.programme",
        avgCount: 100,
        minCount: 0,
        maxCount: 500,
        sampleSize: 1000,
      });

      const provider = new DatabaseProvider("conn-1", tableMapping);
      const result = await provider.fetchCardinality(["programme"]);

      expect(mockFetchCardinality).toHaveBeenCalledWith("conn-1", "public.programme");
      expect(result).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(result[0]!.elementPath).toBe("public.programme");
    });

    it("returns empty array when electronAPI is unavailable", async () => {
      removeElectronAPI();
      const provider = new DatabaseProvider("conn-1", new Map());
      const result = await provider.fetchCardinality(["programme"]);
      expect(result).toEqual([]);
    });
  });
});
