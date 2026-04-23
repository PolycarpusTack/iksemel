/**
 * Functions for applying diff changes to configuration snapshots.
 *
 * Supports applying individual changes (cherry-picking) or applying a
 * selected subset of changes from a full diff. All functions are pure
 * and return new snapshot objects -- no mutation occurs.
 *
 * No React or DOM dependencies.
 */

import type {
  ColumnDefinition,
  StyleConfig,
  ReportMetadata,
  SortConfig,
  ExportFormat,
  SelectionState,
} from "@/types";

import type {
  ConfigSnapshot,
  ConfigDiffResult,
  DiffChange,
} from "./types";

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Apply a single diff change to a config snapshot.
 *
 * @param snapshot    The base snapshot to modify
 * @param change      The change to apply
 * @param targetValue Whether to apply the "old" or "new" value from the change
 * @returns A new snapshot with the change applied
 */
export function applyChange(
  snapshot: ConfigSnapshot,
  change: DiffChange,
  targetValue: "old" | "new",
): ConfigSnapshot {
  switch (change.category) {
    case "field":
      return applyFieldChange(snapshot, change, targetValue);
    case "column":
      return applyColumnChange(snapshot, change, targetValue);
    case "style":
      return applyStyleChange(snapshot, change, targetValue);
    case "metadata":
      return applyMetadataChange(snapshot, change, targetValue);
    case "format":
      return applyFormatChange(snapshot, change, targetValue);
    case "sort":
      return applySortChange(snapshot, change, targetValue);
    case "group":
      return applyGroupChange(snapshot, change, targetValue);
  }
}

/**
 * Apply multiple changes selectively.
 *
 * Starts from `base` and, for each change in the diff whose ID is in the
 * `accepted` set, takes the corresponding value from `target`. Changes
 * whose IDs are not accepted leave the base value untouched.
 *
 * @param base      The starting snapshot
 * @param target    The target snapshot (source of "new" values)
 * @param diff      The full diff between base and target
 * @param accepted  Set of change IDs to accept (apply target values)
 * @returns A new snapshot with only the accepted changes applied
 */
export function applySelectedChanges(
  base: ConfigSnapshot,
  target: ConfigSnapshot,
  diff: ConfigDiffResult,
  accepted: ReadonlySet<string>,
): ConfigSnapshot {
  let result = base;

  for (const change of diff.changes) {
    if (accepted.has(change.id)) {
      result = applyChangeFromSnapshots(result, base, target, change);
    }
  }

  return result;
}

// ─── Internal: Apply from snapshot pair ──────────────────────────────

/**
 * Apply a single change by pulling the appropriate concrete value from
 * the target snapshot, rather than parsing stringified values.
 */
function applyChangeFromSnapshots(
  current: ConfigSnapshot,
  _base: ConfigSnapshot,
  target: ConfigSnapshot,
  change: DiffChange,
): ConfigSnapshot {
  switch (change.category) {
    case "field":
      return applyFieldFromTarget(current, target, change);
    case "column":
      return applyColumnFromTarget(current, target, change);
    case "style":
      return applyStyleFromTarget(current, target, change);
    case "metadata":
      return applyMetadataFromTarget(current, target, change);
    case "format":
      return { ...current, format: target.format };
    case "sort":
      return { ...current, sortBy: target.sortBy };
    case "group":
      return { ...current, groupBy: target.groupBy };
  }
}

// ─── Field changes ───────────────────────────────────────────────────

function applyFieldChange(
  snapshot: ConfigSnapshot,
  change: DiffChange,
  targetValue: "old" | "new",
): ConfigSnapshot {
  const fieldKey = extractFieldKey(change.path);
  if (fieldKey === undefined) return snapshot;

  const shouldSelect =
    (change.changeType === "added" && targetValue === "new") ||
    (change.changeType === "removed" && targetValue === "old");

  const updated: Record<string, boolean | undefined> = { ...snapshot.selection };

  if (shouldSelect) {
    updated[fieldKey] = true;
  } else {
    Reflect.deleteProperty(updated, fieldKey);
  }

  return { ...snapshot, selection: updated as SelectionState };
}

function applyFieldFromTarget(
  current: ConfigSnapshot,
  target: ConfigSnapshot,
  change: DiffChange,
): ConfigSnapshot {
  const fieldKey = extractFieldKey(change.path);
  if (fieldKey === undefined) return current;

  const updated: Record<string, boolean | undefined> = { ...current.selection };
  const targetSelected = target.selection[fieldKey] === true;

  if (targetSelected) {
    updated[fieldKey] = true;
  } else {
    Reflect.deleteProperty(updated, fieldKey);
  }

  return { ...current, selection: updated as SelectionState };
}

function extractFieldKey(path: string): string | undefined {
  // Path format: "selection.<fieldKey>"
  const prefix = "selection.";
  if (!path.startsWith(prefix)) return undefined;
  return path.slice(prefix.length);
}

// ─── Column changes ──────────────────────────────────────────────────

function applyColumnChange(
  snapshot: ConfigSnapshot,
  change: DiffChange,
  targetValue: "old" | "new",
): ConfigSnapshot {
  const columnId = extractColumnId(change.path);
  if (columnId === undefined) return snapshot;

  // Added column: applying "new" means adding, applying "old" means no-op
  if (change.changeType === "added") {
    if (targetValue === "new" && change.newValue !== undefined) {
      // We only have the header string; cannot reconstruct a full column from
      // a single DiffChange. For full fidelity, use applySelectedChanges.
      return snapshot;
    }
    // targetValue === "old": remove the column if it somehow exists
    return {
      ...snapshot,
      columns: snapshot.columns.filter((c) => c.id !== columnId),
    };
  }

  // Removed column: applying "old" means keeping, applying "new" means removing
  if (change.changeType === "removed") {
    if (targetValue === "new") {
      return {
        ...snapshot,
        columns: snapshot.columns.filter((c) => c.id !== columnId),
      };
    }
    return snapshot;
  }

  // Modified column property
  if (change.changeType === "modified") {
    const prop = extractColumnProp(change.path);
    if (prop === undefined) return snapshot;

    const value = targetValue === "new" ? change.newValue : change.oldValue;
    if (value === undefined) return snapshot;

    return {
      ...snapshot,
      columns: snapshot.columns.map((col) => {
        if (col.id !== columnId) return col;
        return applyColumnProp(col, prop, value);
      }),
    };
  }

  return snapshot;
}

function applyColumnFromTarget(
  current: ConfigSnapshot,
  target: ConfigSnapshot,
  change: DiffChange,
): ConfigSnapshot {
  const columnId = extractColumnId(change.path);
  if (columnId === undefined) return current;

  if (change.changeType === "added") {
    // Pull the full column from target
    const targetCol = target.columns.find((c) => c.id === columnId);
    if (targetCol === undefined) return current;

    const exists = current.columns.some((c) => c.id === columnId);
    if (exists) return current;

    return { ...current, columns: [...current.columns, targetCol] };
  }

  if (change.changeType === "removed") {
    return {
      ...current,
      columns: current.columns.filter((c) => c.id !== columnId),
    };
  }

  // Modified: pull the specific property from target column
  if (change.changeType === "modified") {
    const prop = extractColumnProp(change.path);
    if (prop === undefined) return current;

    const targetCol = target.columns.find((c) => c.id === columnId);
    if (targetCol === undefined) return current;

    return {
      ...current,
      columns: current.columns.map((col) => {
        if (col.id !== columnId) return col;
        return { ...col, [prop]: targetCol[prop as keyof ColumnDefinition] };
      }),
    };
  }

  return current;
}

function extractColumnId(path: string): string | undefined {
  // Path format: "columns.<id>" or "columns.<id>.<prop>"
  const parts = path.split(".");
  if (parts.length < 2 || parts[0] !== "columns") return undefined;
  return parts[1];
}

function extractColumnProp(path: string): string | undefined {
  // Path format: "columns.<id>.<prop>"
  const parts = path.split(".");
  if (parts.length < 3) return undefined;
  return parts[2];
}

function applyColumnProp(
  col: ColumnDefinition,
  prop: string,
  value: string,
): ColumnDefinition {
  switch (prop) {
    case "header":
    case "xpath":
    case "fullPath":
      return { ...col, [prop]: value };
    case "format":
      return { ...col, format: value as ColumnDefinition["format"] };
    case "align":
      return { ...col, align: value as ColumnDefinition["align"] };
    case "width":
      return { ...col, width: Number(value) };
    default:
      return col;
  }
}

// ─── Style changes ───────────────────────────────────────────────────

function applyStyleChange(
  snapshot: ConfigSnapshot,
  change: DiffChange,
  targetValue: "old" | "new",
): ConfigSnapshot {
  const prop = extractStyleProp(change.path);
  if (prop === undefined) return snapshot;

  const value = targetValue === "new" ? change.newValue : change.oldValue;
  if (value === undefined) return snapshot;

  return {
    ...snapshot,
    style: applyStyleProp(snapshot.style, prop, value),
  };
}

function applyStyleFromTarget(
  current: ConfigSnapshot,
  target: ConfigSnapshot,
  change: DiffChange,
): ConfigSnapshot {
  const prop = extractStyleProp(change.path);
  if (prop === undefined) return current;

  const targetVal = target.style[prop as keyof StyleConfig];

  return {
    ...current,
    style: { ...current.style, [prop]: targetVal },
  };
}

function extractStyleProp(path: string): string | undefined {
  // Path format: "style.<prop>"
  const prefix = "style.";
  if (!path.startsWith(prefix)) return undefined;
  return path.slice(prefix.length);
}

function applyStyleProp(
  style: StyleConfig,
  prop: string,
  value: string,
): StyleConfig {
  switch (prop) {
    case "showTitle":
    case "showFooter":
    case "autoFilter":
      return { ...style, [prop]: value === "true" };
    case "orientation":
      return { ...style, orientation: value as StyleConfig["orientation"] };
    case "name":
    case "headerBg":
    case "headerFg":
    case "altRowBg":
    case "groupBg":
    case "fontFamily":
    case "fontSize":
    case "delimiter":
    case "quoteChar":
    case "margins":
      return { ...style, [prop]: value };
    default:
      return style;
  }
}

// ─── Metadata changes ────────────────────────────────────────────────

function applyMetadataChange(
  snapshot: ConfigSnapshot,
  change: DiffChange,
  targetValue: "old" | "new",
): ConfigSnapshot {
  const prop = extractMetadataProp(change.path);
  if (prop === undefined) return snapshot;

  const value = targetValue === "new" ? change.newValue : change.oldValue;
  if (value === undefined) return snapshot;

  return {
    ...snapshot,
    metadata: applyMetadataProp(snapshot.metadata, prop, value),
  };
}

function applyMetadataFromTarget(
  current: ConfigSnapshot,
  target: ConfigSnapshot,
  change: DiffChange,
): ConfigSnapshot {
  const prop = extractMetadataProp(change.path);
  if (prop === undefined) return current;

  const targetVal = target.metadata[prop as keyof ReportMetadata];

  return {
    ...current,
    metadata: { ...current.metadata, [prop]: targetVal },
  };
}

function extractMetadataProp(path: string): string | undefined {
  // Path format: "metadata.<prop>"
  const prefix = "metadata.";
  if (!path.startsWith(prefix)) return undefined;
  return path.slice(prefix.length);
}

function applyMetadataProp(
  metadata: ReportMetadata,
  prop: string,
  value: string,
): ReportMetadata {
  switch (prop) {
    case "tags":
      return {
        ...metadata,
        tags: value.length === 0 ? [] : value.split(", "),
      };
    case "scheduleEnabled":
    case "overwrite":
      return { ...metadata, [prop]: value === "true" };
    case "name":
    case "description":
    case "version":
    case "author":
    case "category":
    case "scheduleCron":
    case "scheduleDescription":
    case "outputPath":
    case "emailRecipients":
    case "xsltProcessor":
    case "stylePreset":
      return { ...metadata, [prop]: value };
    default:
      return metadata;
  }
}

// ─── Format changes ──────────────────────────────────────────────────

function applyFormatChange(
  snapshot: ConfigSnapshot,
  change: DiffChange,
  targetValue: "old" | "new",
): ConfigSnapshot {
  const value = targetValue === "new" ? change.newValue : change.oldValue;
  if (value === undefined) return snapshot;

  return { ...snapshot, format: value as ExportFormat };
}

// ─── Sort changes ────────────────────────────────────────────────────

function applySortChange(
  snapshot: ConfigSnapshot,
  change: DiffChange,
  targetValue: "old" | "new",
): ConfigSnapshot {
  // Sort added
  if (change.changeType === "added") {
    if (targetValue === "new" && change.newValue !== undefined) {
      return { ...snapshot, sortBy: parseSortValue(change.newValue) };
    }
    return { ...snapshot, sortBy: null };
  }

  // Sort removed
  if (change.changeType === "removed") {
    if (targetValue === "old" && change.oldValue !== undefined) {
      return { ...snapshot, sortBy: parseSortValue(change.oldValue) };
    }
    return { ...snapshot, sortBy: null };
  }

  // Sort field or dir modified
  if (change.changeType === "modified") {
    const value = targetValue === "new" ? change.newValue : change.oldValue;
    if (value === undefined || snapshot.sortBy === null) return snapshot;

    if (change.path === "sortBy.field") {
      return { ...snapshot, sortBy: { ...snapshot.sortBy, field: value } };
    }
    if (change.path === "sortBy.dir") {
      return {
        ...snapshot,
        sortBy: {
          ...snapshot.sortBy,
          dir: value as SortConfig["dir"],
        },
      };
    }
  }

  return snapshot;
}

function parseSortValue(value: string): SortConfig {
  const lastSpace = value.lastIndexOf(" ");
  if (lastSpace === -1) {
    return { field: value, dir: "asc" };
  }
  const field = value.slice(0, lastSpace);
  const dir = value.slice(lastSpace + 1) as SortConfig["dir"];
  return { field, dir: dir === "desc" ? "desc" : "asc" };
}

// ─── Group changes ───────────────────────────────────────────────────

function applyGroupChange(
  snapshot: ConfigSnapshot,
  change: DiffChange,
  targetValue: "old" | "new",
): ConfigSnapshot {
  if (change.changeType === "added") {
    return {
      ...snapshot,
      groupBy: targetValue === "new" ? (change.newValue ?? null) : null,
    };
  }

  if (change.changeType === "removed") {
    return {
      ...snapshot,
      groupBy: targetValue === "old" ? (change.oldValue ?? null) : null,
    };
  }

  // Modified
  const value = targetValue === "new" ? change.newValue : change.oldValue;
  return { ...snapshot, groupBy: value ?? null };
}
