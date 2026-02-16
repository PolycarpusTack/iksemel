/**
 * Enhanced configuration diff engine.
 *
 * Compares two {@link ConfigSnapshot} instances and produces a richly
 * structured {@link ConfigDiffResult} with individually identifiable
 * changes, human-readable labels, and summary statistics.
 *
 * Pure functions only -- no React or DOM dependencies.
 */

import type {
  StyleConfig,
  ReportMetadata,
  SortConfig,
} from "@/types";

import type {
  ConfigSnapshot,
  ConfigDiffResult,
  DiffChange,
  DiffSummary,
} from "./types";

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Compare two configuration snapshots and produce a detailed diff.
 *
 * @param before  The original configuration snapshot
 * @param after   The updated configuration snapshot
 * @returns A structured diff result with individually addressable changes
 */
export function diffConfigs(
  before: ConfigSnapshot,
  after: ConfigSnapshot,
): ConfigDiffResult {
  const changes: DiffChange[] = [
    ...diffFields(before, after),
    ...diffColumns(before, after),
    ...diffStyle(before.style, after.style),
    ...diffMetadata(before.metadata, after.metadata),
    ...diffFormat(before, after),
    ...diffSort(before.sortBy, after.sortBy),
    ...diffGroup(before.groupBy, after.groupBy),
  ];

  const summary = buildSummary(changes);
  const isIdentical = changes.length === 0;
  const description = buildDescription(summary);

  return { changes, summary, isIdentical, description };
}

// ─── Field diffing ───────────────────────────────────────────────────

function diffFields(
  before: ConfigSnapshot,
  after: ConfigSnapshot,
): DiffChange[] {
  const changes: DiffChange[] = [];
  const allKeys = new Set([
    ...Object.keys(before.selection),
    ...Object.keys(after.selection),
  ]);

  let addIdx = 0;
  let removeIdx = 0;

  for (const key of allKeys) {
    const wasSelected = before.selection[key] === true;
    const isSelected = after.selection[key] === true;

    if (!wasSelected && isSelected) {
      changes.push({
        id: `field-add-${addIdx++}`,
        category: "field",
        changeType: "added",
        path: `selection.${key}`,
        label: `Field "${key}" added`,
        newValue: "true",
      });
    } else if (wasSelected && !isSelected) {
      changes.push({
        id: `field-remove-${removeIdx++}`,
        category: "field",
        changeType: "removed",
        path: `selection.${key}`,
        label: `Field "${key}" removed`,
        oldValue: "true",
      });
    }
  }

  return changes;
}

// ─── Column diffing ──────────────────────────────────────────────────

/** Properties of ColumnDefinition that we compare for modifications. */
const COLUMN_PROPS = [
  "header",
  "xpath",
  "format",
  "align",
  "width",
  "fullPath",
] as const;

function diffColumns(
  before: ConfigSnapshot,
  after: ConfigSnapshot,
): DiffChange[] {
  const changes: DiffChange[] = [];

  const beforeMap = new Map(before.columns.map((c) => [c.id, c]));
  const afterMap = new Map(after.columns.map((c) => [c.id, c]));

  let addIdx = 0;
  let removeIdx = 0;

  // Columns added
  for (const [id, col] of afterMap) {
    if (!beforeMap.has(id)) {
      changes.push({
        id: `col-add-${addIdx++}`,
        category: "column",
        changeType: "added",
        path: `columns.${id}`,
        label: `Column "${col.header}" added`,
        newValue: col.header,
      });
    }
  }

  // Columns removed
  for (const [id, col] of beforeMap) {
    if (!afterMap.has(id)) {
      changes.push({
        id: `col-remove-${removeIdx++}`,
        category: "column",
        changeType: "removed",
        path: `columns.${id}`,
        label: `Column "${col.header}" removed`,
        oldValue: col.header,
      });
    }
  }

  // Columns modified (compare each property)
  for (const [id, beforeCol] of beforeMap) {
    const afterCol = afterMap.get(id);
    if (afterCol === undefined) continue;

    for (const prop of COLUMN_PROPS) {
      const oldVal = String(beforeCol[prop]);
      const newVal = String(afterCol[prop]);

      if (oldVal !== newVal) {
        changes.push({
          id: `col-mod-${prop}-${id}`,
          category: "column",
          changeType: "modified",
          path: `columns.${id}.${prop}`,
          label: `Column "${beforeCol.header}" ${prop} changed`,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
  }

  return changes;
}

// ─── Style diffing ───────────────────────────────────────────────────

function diffStyle(before: StyleConfig, after: StyleConfig): DiffChange[] {
  const changes: DiffChange[] = [];

  const keys = [...new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ])] as ReadonlyArray<keyof StyleConfig>;
  for (const key of keys) {
    const oldVal = String(before[key]);
    const newVal = String(after[key]);

    if (oldVal !== newVal) {
      changes.push({
        id: `style-mod-${key}`,
        category: "style",
        changeType: "modified",
        path: `style.${key}`,
        label: `Style "${key}" changed`,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return changes;
}

// ─── Metadata diffing ────────────────────────────────────────────────

function diffMetadata(
  before: ReportMetadata,
  after: ReportMetadata,
): DiffChange[] {
  const changes: DiffChange[] = [];

  const keys = [...new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ])] as ReadonlyArray<keyof ReportMetadata>;
  for (const key of keys) {
    const bVal = before[key];
    const aVal = after[key];

    let changed = false;
    let oldStr: string;
    let newStr: string;

    // Handle arrays (tags)
    if (Array.isArray(bVal) && Array.isArray(aVal)) {
      oldStr = bVal.join(", ");
      newStr = aVal.join(", ");
      changed =
        bVal.length !== aVal.length || bVal.some((v, i) => v !== aVal[i]);
    } else {
      oldStr = String(bVal);
      newStr = String(aVal);
      changed = oldStr !== newStr;
    }

    if (changed) {
      changes.push({
        id: `meta-mod-${key}`,
        category: "metadata",
        changeType: "modified",
        path: `metadata.${key}`,
        label: `Metadata "${key}" changed`,
        oldValue: oldStr,
        newValue: newStr,
      });
    }
  }

  return changes;
}

// ─── Format diffing ──────────────────────────────────────────────────

function diffFormat(
  before: ConfigSnapshot,
  after: ConfigSnapshot,
): DiffChange[] {
  if (before.format === after.format) return [];

  return [
    {
      id: "format-mod-0",
      category: "format",
      changeType: "modified",
      path: "format",
      label: `Format changed from "${before.format}" to "${after.format}"`,
      oldValue: before.format,
      newValue: after.format,
    },
  ];
}

// ─── Sort diffing ────────────────────────────────────────────────────

function diffSort(
  before: SortConfig | null,
  after: SortConfig | null,
): DiffChange[] {
  const changes: DiffChange[] = [];

  if (before === null && after === null) return changes;

  if (before === null && after !== null) {
    changes.push({
      id: "sort-add-0",
      category: "sort",
      changeType: "added",
      path: "sortBy",
      label: `Sort added: ${after.field} ${after.dir}`,
      newValue: `${after.field} ${after.dir}`,
    });
    return changes;
  }

  if (before !== null && after === null) {
    changes.push({
      id: "sort-remove-0",
      category: "sort",
      changeType: "removed",
      path: "sortBy",
      label: `Sort removed: ${before.field} ${before.dir}`,
      oldValue: `${before.field} ${before.dir}`,
    });
    return changes;
  }

  // Both non-null
  const b = before as SortConfig;
  const a = after as SortConfig;

  if (b.field !== a.field) {
    changes.push({
      id: "sort-mod-field",
      category: "sort",
      changeType: "modified",
      path: "sortBy.field",
      label: "Sort field changed",
      oldValue: b.field,
      newValue: a.field,
    });
  }

  if (b.dir !== a.dir) {
    changes.push({
      id: "sort-mod-dir",
      category: "sort",
      changeType: "modified",
      path: "sortBy.dir",
      label: "Sort direction changed",
      oldValue: b.dir,
      newValue: a.dir,
    });
  }

  return changes;
}

// ─── Group diffing ───────────────────────────────────────────────────

function diffGroup(
  before: string | null,
  after: string | null,
): DiffChange[] {
  if (before === after) return [];

  if (before === null && after !== null) {
    return [
      {
        id: "group-add-0",
        category: "group",
        changeType: "added",
        path: "groupBy",
        label: `Group-by added: "${after}"`,
        newValue: after,
      },
    ];
  }

  if (before !== null && after === null) {
    return [
      {
        id: "group-remove-0",
        category: "group",
        changeType: "removed",
        path: "groupBy",
        label: `Group-by removed: "${before}"`,
        oldValue: before,
      },
    ];
  }

  // Both non-null and different
  return [
    {
      id: "group-mod-0",
      category: "group",
      changeType: "modified",
      path: "groupBy",
      label: "Group-by changed",
      oldValue: before as string,
      newValue: after as string,
    },
  ];
}

// ─── Summary helpers ─────────────────────────────────────────────────

function buildSummary(changes: readonly DiffChange[]): DiffSummary {
  let added = 0;
  let removed = 0;
  let modified = 0;
  const byCategory: Record<string, number> = {};

  for (const change of changes) {
    switch (change.changeType) {
      case "added":
        added++;
        break;
      case "removed":
        removed++;
        break;
      case "modified":
        modified++;
        break;
    }

    byCategory[change.category] = (byCategory[change.category] ?? 0) + 1;
  }

  return {
    totalChanges: changes.length,
    added,
    removed,
    modified,
    byCategory,
  };
}

function buildDescription(summary: DiffSummary): string {
  if (summary.totalChanges === 0) return "No changes";

  const parts: string[] = [];

  if (summary.added > 0) {
    parts.push(
      `${summary.added} addition${summary.added === 1 ? "" : "s"}`,
    );
  }
  if (summary.removed > 0) {
    parts.push(
      `${summary.removed} removal${summary.removed === 1 ? "" : "s"}`,
    );
  }
  if (summary.modified > 0) {
    parts.push(
      `${summary.modified} modification${summary.modified === 1 ? "" : "s"}`,
    );
  }

  const categoryParts: string[] = [];
  for (const [cat, count] of Object.entries(summary.byCategory)) {
    categoryParts.push(`${count} ${cat}`);
  }

  return `${parts.join(", ")} (${categoryParts.join(", ")})`;
}
