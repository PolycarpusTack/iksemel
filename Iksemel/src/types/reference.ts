/**
 * Reference data type definitions.
 *
 * Reference data (channels, genres, etc.) is sent by WHATS'ON via
 * postMessage at startup. It provides lookup values for filter
 * dropdowns without requiring any database queries from XFEB.
 */

/**
 * A single reference data entry for a schema field.
 */
export interface ReferenceDataEntry {
  /** XPath identifying the field this reference data applies to */
  readonly xpath: string;
  /** Available values for the field */
  readonly values: readonly string[];
  /** Optional human-readable labels (parallel array to values) */
  readonly labels?: readonly string[];
}

/**
 * Reference data lookup, keyed by XPath.
 */
export type ReferenceData = Readonly<Record<string, ReferenceDataEntry>>;
