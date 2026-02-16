/**
 * Data provider barrel export.
 *
 * Re-exports all types and classes, plus a factory function that
 * creates the appropriate provider based on runtime options.
 *
 * Pure TypeScript -- no React imports.
 */

/* Types */
export type {
  SampleValue,
  FieldSampleData,
  CardinalityStats,
  SampleDataResponse,
  DataProvider,
  CacheEntry,
} from "./types";

/* Providers */
export { SyntheticDataProvider } from "./synthetic-provider";
export { ApiDataProvider } from "./api-provider";
export { CachedDataProvider } from "./cached-provider";

/* Payload estimator */
export { estimatePayloadWithData } from "./payload-estimator";

/* Factory */
import type { DataProvider } from "./types";
import { SyntheticDataProvider } from "./synthetic-provider";
import { ApiDataProvider } from "./api-provider";
import { CachedDataProvider } from "./cached-provider";

/**
 * Creates an appropriate DataProvider based on the supplied options.
 *
 * - If `apiBaseUrl` is provided, returns an ApiDataProvider wrapped
 *   in a CachedDataProvider.
 * - Otherwise, returns a SyntheticDataProvider (no caching needed
 *   since generation is instant).
 */
export function createDataProvider(options?: {
  apiBaseUrl?: string;
  cacheTtlMs?: number;
}): DataProvider {
  if (options?.apiBaseUrl) {
    const api = new ApiDataProvider(options.apiBaseUrl);
    return new CachedDataProvider(api, options.cacheTtlMs);
  }
  return new SyntheticDataProvider();
}
