/**
 * Cached data provider.
 *
 * Wraps any DataProvider with TTL-based caching. Stale entries are
 * evicted lazily on access, and the entire cache can be cleared
 * manually via clearCache().
 *
 * Pure TypeScript -- no React imports.
 */

import type {
  DataProvider,
  SampleDataResponse,
  CardinalityStats,
  CacheEntry,
} from "./types";

/** Default cache TTL: 5 minutes. */
const DEFAULT_TTL_MS = 5 * 60 * 1_000;

/** Maximum entries per cache map to prevent unbounded growth. */
const MAX_CACHE_SIZE = 100;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeCacheKey(paths: readonly string[]): string {
  return [...paths].sort().join(",");
}

function isStale<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.fetchedAt > entry.ttlMs;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export class CachedDataProvider implements DataProvider {
  private readonly inner: DataProvider;
  private readonly ttlMs: number;

  private readonly sampleCache = new Map<string, CacheEntry<SampleDataResponse>>();
  private readonly cardinalityCache = new Map<
    string,
    CacheEntry<readonly CardinalityStats[]>
  >();

  constructor(inner: DataProvider, ttlMs: number = DEFAULT_TTL_MS) {
    this.inner = inner;
    this.ttlMs = ttlMs;
  }

  /** Delegate source to the wrapped provider. */
  get source(): "api" | "synthetic" {
    return this.inner.source;
  }

  /* ---------------------------------------------------------------- */
  /*  fetchSampleData                                                  */
  /* ---------------------------------------------------------------- */

  async fetchSampleData(
    fieldPaths: readonly string[],
    limit?: number,
  ): Promise<SampleDataResponse> {
    const key = makeCacheKey(fieldPaths) + `|limit=${limit ?? ""}`;

    const cached = this.sampleCache.get(key);
    if (cached && !isStale(cached)) {
      return cached.data;
    }

    // Evict the stale entry
    if (cached) this.sampleCache.delete(key);

    const result = await this.inner.fetchSampleData(fieldPaths, limit);
    this.evictIfFull(this.sampleCache);
    this.sampleCache.set(key, {
      data: result,
      fetchedAt: Date.now(),
      ttlMs: this.ttlMs,
    });
    return result;
  }

  /* ---------------------------------------------------------------- */
  /*  fetchCardinality                                                 */
  /* ---------------------------------------------------------------- */

  async fetchCardinality(
    elementPaths: readonly string[],
  ): Promise<readonly CardinalityStats[]> {
    const key = makeCacheKey(elementPaths);

    const cached = this.cardinalityCache.get(key);
    if (cached && !isStale(cached)) {
      return cached.data;
    }

    // Evict the stale entry
    if (cached) this.cardinalityCache.delete(key);

    const result = await this.inner.fetchCardinality(elementPaths);
    this.evictIfFull(this.cardinalityCache);
    this.cardinalityCache.set(key, {
      data: result,
      fetchedAt: Date.now(),
      ttlMs: this.ttlMs,
    });
    return result;
  }

  /* ---------------------------------------------------------------- */
  /*  isAvailable / clearCache                                         */
  /* ---------------------------------------------------------------- */

  isAvailable(): boolean {
    return this.inner.isAvailable();
  }

  /** Evict all cached entries. */
  clearCache(): void {
    this.sampleCache.clear();
    this.cardinalityCache.clear();
  }

  /** Evict the oldest entry if the cache exceeds MAX_CACHE_SIZE. */
  private evictIfFull<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size < MAX_CACHE_SIZE) return;
    // Delete the first (oldest inserted) key
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }
}
