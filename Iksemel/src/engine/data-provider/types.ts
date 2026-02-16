/**
 * Data provider types.
 *
 * Defines the DataProvider interface and all related types used by
 * the data abstraction layer. Components depend on this interface,
 * not on concrete implementations.
 *
 * Pure TypeScript -- no React imports.
 */

/**
 * Sample data value for a schema field.
 */
export interface SampleValue {
  readonly value: string;
  readonly count: number; // occurrence count in sample
}

/**
 * Sample data for a single field.
 */
export interface FieldSampleData {
  readonly fieldId: string;
  readonly fieldPath: string;
  readonly values: readonly SampleValue[];
  readonly totalCount: number;
  readonly distinctCount: number;
  readonly nullCount: number;
}

/**
 * Cardinality statistics for data-informed payload estimation.
 */
export interface CardinalityStats {
  readonly elementPath: string;
  readonly avgCount: number;
  readonly minCount: number;
  readonly maxCount: number;
  readonly sampleSize: number;
}

/**
 * Response from the data provider.
 */
export interface SampleDataResponse {
  readonly fields: readonly FieldSampleData[];
  readonly cardinality: readonly CardinalityStats[];
  readonly fetchedAt: number; // timestamp
  readonly source: "api" | "synthetic";
}

/**
 * Data provider interface. Components depend on this, not on implementations.
 */
export interface DataProvider {
  /** Fetch sample data for the specified field paths */
  fetchSampleData(
    fieldPaths: readonly string[],
    limit?: number,
  ): Promise<SampleDataResponse>;

  /** Fetch cardinality statistics for repeating elements */
  fetchCardinality(
    elementPaths: readonly string[],
  ): Promise<readonly CardinalityStats[]>;

  /** Check if the provider is connected/available */
  isAvailable(): boolean;

  /** Provider source type */
  readonly source: "api" | "synthetic";
}

/**
 * Cache entry for sample data.
 */
export interface CacheEntry<T> {
  readonly data: T;
  readonly fetchedAt: number;
  readonly ttlMs: number;
}
