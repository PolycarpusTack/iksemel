/**
 * Enhanced configuration diff types.
 *
 * Describes the shape of a configuration snapshot and the structured
 * diff produced when comparing two snapshots. Every type is a plain
 * data structure with no React or DOM dependencies.
 */

import type {
  ColumnDefinition,
  StyleConfig,
  SortConfig,
  ExportFormat,
  ReportMetadata,
  SelectionState,
} from "@/types";

// ─── Diff change types ───────────────────────────────────────────────

/**
 * A single change between two configurations.
 */
export interface DiffChange {
  /** Unique ID for this change */
  readonly id: string;
  /** Category of the change */
  readonly category:
    | "field"
    | "column"
    | "style"
    | "metadata"
    | "format"
    | "sort"
    | "group";
  /** Type of change */
  readonly changeType: "added" | "removed" | "modified";
  /** Dot-notation path describing what changed (e.g., "columns.0.header", "style.headerBg") */
  readonly path: string;
  /** Human-readable label */
  readonly label: string;
  /** Old value (undefined for "added") */
  readonly oldValue?: string;
  /** New value (undefined for "removed") */
  readonly newValue?: string;
}

/**
 * Summary counts for a diff result.
 */
export interface DiffSummary {
  readonly totalChanges: number;
  readonly added: number;
  readonly removed: number;
  readonly modified: number;
  readonly byCategory: Readonly<Record<string, number>>;
}

/**
 * Complete diff result between two configurations.
 */
export interface ConfigDiffResult {
  /** All changes detected */
  readonly changes: readonly DiffChange[];
  /** Summary counts by category */
  readonly summary: DiffSummary;
  /** Whether the configs are identical */
  readonly isIdentical: boolean;
  /** Human-readable summary string */
  readonly description: string;
}

// ─── Configuration snapshot ──────────────────────────────────────────

/**
 * A snapshot of XFEB configuration suitable for diffing.
 *
 * Captures every dimension of the export configuration so that any
 * two snapshots can be compared to produce a {@link ConfigDiffResult}.
 */
export interface ConfigSnapshot {
  readonly selection: SelectionState;
  readonly columns: readonly ColumnDefinition[];
  readonly format: ExportFormat;
  readonly rowSource: string;
  readonly style: StyleConfig;
  readonly groupBy: string | null;
  readonly sortBy: SortConfig | null;
  readonly metadata: ReportMetadata;
}
