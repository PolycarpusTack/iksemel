/**
 * Tests for the data-provider module.
 *
 * Covers SyntheticDataProvider, CachedDataProvider, and the
 * createDataProvider factory function.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { SyntheticDataProvider } from "./synthetic-provider";
import { CachedDataProvider } from "./cached-provider";
import { createDataProvider } from "./index";
import type { DataProvider, SampleDataResponse, CardinalityStats } from "./types";

// ─── SyntheticDataProvider ─────────────────────────────────────────────

describe("SyntheticDataProvider", () => {
  let provider: SyntheticDataProvider;

  beforeEach(() => {
    provider = new SyntheticDataProvider();
  });

  it("returns sample data for field paths", async () => {
    const res = await provider.fetchSampleData(["Channel/Name", "Slot/Date"]);
    expect(res.fields).toHaveLength(2);
    expect(res.source).toBe("synthetic");
    expect(res.fetchedAt).toBeGreaterThan(0);
  });

  it('generates name-pattern values for fields containing "Name"', async () => {
    const res = await provider.fetchSampleData(["Channel/Name"]);
    const field = res.fields[0]!;
    expect(field.fieldPath).toBe("Channel/Name");
    // Name generator uses BROADCASTER_NAMES pool
    const values = field.values.map((v) => v.value);
    expect(values).toContain("VTM");
    expect(values).toContain("een");
  });

  it('generates date values for fields containing "Date"', async () => {
    const res = await provider.fetchSampleData(["Slot/BroadcastDate"]);
    const field = res.fields[0]!;
    // Date values should be ISO date strings (YYYY-MM-DD)
    for (const v of field.values) {
      expect(v.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('generates time values for fields containing "Time"', async () => {
    const res = await provider.fetchSampleData(["Slot/StartTime"]);
    const field = res.fields[0]!;
    // Time values should be HH:MM:SS format
    for (const v of field.values) {
      expect(v.value).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    }
  });

  it('generates code values for fields containing "Code"', async () => {
    const res = await provider.fetchSampleData(["Programme/Code"]);
    const field = res.fields[0]!;
    const values = field.values.map((v) => v.value);
    expect(values).toContain("CH01");
    expect(values).toContain("SL042");
  });

  it('generates title values for fields containing "Title"', async () => {
    const res = await provider.fetchSampleData(["Programme/Title"]);
    const field = res.fields[0]!;
    const values = field.values.map((v) => v.value);
    expect(values).toContain("News");
    expect(values).toContain("Weather");
  });

  it('generates duration values for fields containing "Duration"', async () => {
    const res = await provider.fetchSampleData(["Slot/Duration"]);
    const field = res.fields[0]!;
    const values = field.values.map((v) => v.value);
    expect(values).toContain("PT30M");
    expect(values).toContain("PT1H");
  });

  it("returns generic values for unrecognized field patterns", async () => {
    const res = await provider.fetchSampleData(["SomeRandomField"]);
    const field = res.fields[0]!;
    // Generic values follow the pattern value-N
    const firstValue = field.values[0]!.value;
    expect(firstValue).toMatch(/^value-\d+$/);
  });

  it("returns cardinality stats with default avgCount of 50", async () => {
    const stats = await provider.fetchCardinality(["//Slot"]);
    expect(stats).toHaveLength(1);
    expect(stats[0]!.avgCount).toBe(50);
    expect(stats[0]!.minCount).toBe(1);
    expect(stats[0]!.maxCount).toBe(200);
    expect(stats[0]!.sampleSize).toBe(100);
  });

  it("isAvailable() returns true", () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it('source is "synthetic"', () => {
    expect(provider.source).toBe("synthetic");
  });

  it("returns 3-5 sample values per unrecognized field", async () => {
    // Run multiple times to account for randomness; all should be 3-5
    for (let i = 0; i < 10; i++) {
      const res = await provider.fetchSampleData([`UnknownField${i}`]);
      const count = res.fields[0]!.values.length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);
    }
  });

  it("generates cardinality only for paths containing /", async () => {
    const res = await provider.fetchSampleData([
      "Channel/Name",
      "SimpleField",
    ]);
    // Channel/Name contains "/" so gets cardinality; SimpleField does not
    expect(res.cardinality).toHaveLength(1);
    expect(res.cardinality[0]!.elementPath).toBe("Channel/Name");
  });

  it("converts fieldPath to dot-notation fieldId", async () => {
    const res = await provider.fetchSampleData(["Channel/Name"]);
    expect(res.fields[0]!.fieldId).toBe("Channel.Name");
  });
});

// ─── CachedDataProvider ────────────────────────────────────────────────

describe("CachedDataProvider", () => {
  /** Creates a simple mock DataProvider for wrapping with CachedDataProvider. */
  function createMockProvider(): DataProvider & {
    fetchCount: number;
    cardinalityCount: number;
  } {
    let fetchCount = 0;
    let cardinalityCount = 0;

    const mock: DataProvider & {
      fetchCount: number;
      cardinalityCount: number;
    } = {
      source: "synthetic" as const,
      get fetchCount() {
        return fetchCount;
      },
      get cardinalityCount() {
        return cardinalityCount;
      },
      async fetchSampleData(
        fieldPaths: readonly string[],
      ): Promise<SampleDataResponse> {
        fetchCount++;
        return {
          fields: fieldPaths.map((fp) => ({
            fieldId: fp,
            fieldPath: fp,
            values: [{ value: `val-${fetchCount}`, count: 1 }],
            totalCount: 1,
            distinctCount: 1,
            nullCount: 0,
          })),
          cardinality: [],
          fetchedAt: Date.now(),
          source: "synthetic",
        };
      },
      async fetchCardinality(
        elementPaths: readonly string[],
      ): Promise<readonly CardinalityStats[]> {
        cardinalityCount++;
        return elementPaths.map((p) => ({
          elementPath: p,
          avgCount: 10,
          minCount: 1,
          maxCount: 20,
          sampleSize: 50,
        }));
      },
      isAvailable(): boolean {
        return true;
      },
    };

    return mock;
  }

  it("returns cached data on second call with same params", async () => {
    const inner = createMockProvider();
    const cached = new CachedDataProvider(inner, 60_000);

    const r1 = await cached.fetchSampleData(["a", "b"]);
    const r2 = await cached.fetchSampleData(["a", "b"]);

    expect(inner.fetchCount).toBe(1);
    expect(r1).toBe(r2);
  });

  it("evicts stale entries after TTL", async () => {
    const inner = createMockProvider();
    // Use a TTL of 0 to immediately expire
    const cached = new CachedDataProvider(inner, 0);

    await cached.fetchSampleData(["x"]);
    // The entry is stale because TTL=0 and Date.now() will be > fetchedAt
    // Need a small delay for Date.now() to advance at least 1ms
    await new Promise((resolve) => setTimeout(resolve, 5));
    await cached.fetchSampleData(["x"]);

    expect(inner.fetchCount).toBe(2);
  });

  it("clearCache() forces re-fetch", async () => {
    const inner = createMockProvider();
    const cached = new CachedDataProvider(inner, 60_000);

    await cached.fetchSampleData(["a"]);
    cached.clearCache();
    await cached.fetchSampleData(["a"]);

    expect(inner.fetchCount).toBe(2);
  });

  it("delegates isAvailable() to wrapped provider", () => {
    const inner = createMockProvider();
    const cached = new CachedDataProvider(inner);
    expect(cached.isAvailable()).toBe(true);
  });

  it("delegates source to wrapped provider", () => {
    const inner = createMockProvider();
    const cached = new CachedDataProvider(inner);
    expect(cached.source).toBe("synthetic");
  });

  it("caches cardinality data separately", async () => {
    const inner = createMockProvider();
    const cached = new CachedDataProvider(inner, 60_000);

    await cached.fetchCardinality(["//Slot"]);
    await cached.fetchCardinality(["//Slot"]);

    expect(inner.cardinalityCount).toBe(1);
  });

  it("uses sorted cache keys so parameter order does not matter", async () => {
    const inner = createMockProvider();
    const cached = new CachedDataProvider(inner, 60_000);

    await cached.fetchSampleData(["b", "a"]);
    await cached.fetchSampleData(["a", "b"]);

    expect(inner.fetchCount).toBe(1);
  });
});

// ─── Factory: createDataProvider ───────────────────────────────────────

describe("createDataProvider", () => {
  it("creates SyntheticDataProvider when no apiBaseUrl is given", () => {
    const p = createDataProvider();
    expect(p.source).toBe("synthetic");
    expect(p.isAvailable()).toBe(true);
  });

  it("creates SyntheticDataProvider when options is empty object", () => {
    const p = createDataProvider({});
    expect(p.source).toBe("synthetic");
  });

  it("creates CachedDataProvider wrapping ApiDataProvider when apiBaseUrl given", () => {
    const p = createDataProvider({ apiBaseUrl: "http://localhost:3000" });
    // ApiDataProvider has source "api", and CachedDataProvider delegates source
    expect(p.source).toBe("api");
  });
});
