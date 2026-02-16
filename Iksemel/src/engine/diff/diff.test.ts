/**
 * Tests for the diff engine module.
 *
 * Covers diffConfigs, applyChange, and applySelectedChanges.
 */

import { describe, it, expect } from "vitest";

import { diffConfigs } from "./diff-engine";
import { applyChange, applySelectedChanges } from "./diff-apply";
import type { ConfigSnapshot, DiffChange } from "./types";
import type { StyleConfig, ReportMetadata } from "@/types";
import { TEST_STYLE as baseStyle, TEST_METADATA as baseMetadata, makeColumn } from "@/test/fixtures";

function makeSnapshot(
  overrides?: Partial<ConfigSnapshot>,
): ConfigSnapshot {
  return {
    selection: {},
    columns: [],
    format: "xlsx",
    rowSource: "//Slot",
    style: baseStyle,
    groupBy: null,
    sortBy: null,
    metadata: baseMetadata,
    ...overrides,
  };
}

// ─── diffConfigs ───────────────────────────────────────────────────────

describe("diffConfigs", () => {
  it("returns isIdentical=true for identical configs", () => {
    const snap = makeSnapshot({
      selection: { "Slot/Date": true },
      columns: [makeColumn("c1", "Date")],
    });
    const result = diffConfigs(snap, snap);
    expect(result.isIdentical).toBe(true);
    expect(result.changes).toHaveLength(0);
  });

  it("detects field additions", () => {
    const before = makeSnapshot({ selection: {} });
    const after = makeSnapshot({ selection: { "Slot/Date": true } });

    const result = diffConfigs(before, after);
    expect(result.isIdentical).toBe(false);

    const fieldAdds = result.changes.filter(
      (c) => c.category === "field" && c.changeType === "added",
    );
    expect(fieldAdds).toHaveLength(1);
    expect(fieldAdds[0]!.label).toContain("Slot/Date");
  });

  it("detects field removals", () => {
    const before = makeSnapshot({ selection: { "Slot/Date": true } });
    const after = makeSnapshot({ selection: {} });

    const result = diffConfigs(before, after);
    const fieldRemoves = result.changes.filter(
      (c) => c.category === "field" && c.changeType === "removed",
    );
    expect(fieldRemoves).toHaveLength(1);
  });

  it("detects multiple field changes", () => {
    const before = makeSnapshot({
      selection: { A: true, B: true },
    });
    const after = makeSnapshot({
      selection: { B: true, C: true },
    });

    const result = diffConfigs(before, after);
    const fieldChanges = result.changes.filter((c) => c.category === "field");
    // A removed, C added
    expect(fieldChanges).toHaveLength(2);
  });

  it("detects column additions", () => {
    const before = makeSnapshot({ columns: [] });
    const after = makeSnapshot({ columns: [makeColumn("c1", "Date")] });

    const result = diffConfigs(before, after);
    const colAdds = result.changes.filter(
      (c) => c.category === "column" && c.changeType === "added",
    );
    expect(colAdds).toHaveLength(1);
    expect(colAdds[0]!.label).toContain("Date");
  });

  it("detects column removals", () => {
    const before = makeSnapshot({ columns: [makeColumn("c1", "Date")] });
    const after = makeSnapshot({ columns: [] });

    const result = diffConfigs(before, after);
    const colRemoves = result.changes.filter(
      (c) => c.category === "column" && c.changeType === "removed",
    );
    expect(colRemoves).toHaveLength(1);
  });

  it("detects column property modifications (header, format, width)", () => {
    const before = makeSnapshot({
      columns: [makeColumn("c1", "Date", { format: "text", width: 120 })],
    });
    const after = makeSnapshot({
      columns: [makeColumn("c1", "Modified", { format: "date", width: 200 })],
    });

    const result = diffConfigs(before, after);
    const colMods = result.changes.filter(
      (c) => c.category === "column" && c.changeType === "modified",
    );
    // header, format, width all changed
    expect(colMods.length).toBeGreaterThanOrEqual(3);
  });

  it("detects style modifications", () => {
    const modifiedStyle: StyleConfig = { ...baseStyle, headerBg: "#ff0000" };
    const before = makeSnapshot({ style: baseStyle });
    const after = makeSnapshot({ style: modifiedStyle });

    const result = diffConfigs(before, after);
    const styleMods = result.changes.filter((c) => c.category === "style");
    expect(styleMods).toHaveLength(1);
    expect(styleMods[0]!.oldValue).toBe("#1a365d");
    expect(styleMods[0]!.newValue).toBe("#ff0000");
  });

  it("detects metadata modifications", () => {
    const modifiedMeta: ReportMetadata = {
      ...baseMetadata,
      name: "Updated Report",
    };
    const before = makeSnapshot({ metadata: baseMetadata });
    const after = makeSnapshot({ metadata: modifiedMeta });

    const result = diffConfigs(before, after);
    const metaMods = result.changes.filter((c) => c.category === "metadata");
    expect(metaMods.length).toBeGreaterThanOrEqual(1);
    expect(metaMods[0]!.path).toBe("metadata.name");
  });

  it("detects format change", () => {
    const before = makeSnapshot({ format: "xlsx" });
    const after = makeSnapshot({ format: "csv" });

    const result = diffConfigs(before, after);
    const formatChanges = result.changes.filter(
      (c) => c.category === "format",
    );
    expect(formatChanges).toHaveLength(1);
    expect(formatChanges[0]!.oldValue).toBe("xlsx");
    expect(formatChanges[0]!.newValue).toBe("csv");
  });

  it("detects sort added", () => {
    const before = makeSnapshot({ sortBy: null });
    const after = makeSnapshot({
      sortBy: { field: "Date", dir: "asc" },
    });

    const result = diffConfigs(before, after);
    const sortChanges = result.changes.filter((c) => c.category === "sort");
    expect(sortChanges).toHaveLength(1);
    expect(sortChanges[0]!.changeType).toBe("added");
  });

  it("detects sort removed", () => {
    const before = makeSnapshot({
      sortBy: { field: "Date", dir: "asc" },
    });
    const after = makeSnapshot({ sortBy: null });

    const result = diffConfigs(before, after);
    const sortChanges = result.changes.filter((c) => c.category === "sort");
    expect(sortChanges).toHaveLength(1);
    expect(sortChanges[0]!.changeType).toBe("removed");
  });

  it("detects sort field change", () => {
    const before = makeSnapshot({
      sortBy: { field: "Date", dir: "asc" },
    });
    const after = makeSnapshot({
      sortBy: { field: "Title", dir: "asc" },
    });

    const result = diffConfigs(before, after);
    const sortChanges = result.changes.filter(
      (c) => c.category === "sort" && c.path === "sortBy.field",
    );
    expect(sortChanges).toHaveLength(1);
    expect(sortChanges[0]!.oldValue).toBe("Date");
    expect(sortChanges[0]!.newValue).toBe("Title");
  });

  it("detects sort direction change", () => {
    const before = makeSnapshot({
      sortBy: { field: "Date", dir: "asc" },
    });
    const after = makeSnapshot({
      sortBy: { field: "Date", dir: "desc" },
    });

    const result = diffConfigs(before, after);
    const sortChanges = result.changes.filter(
      (c) => c.category === "sort" && c.path === "sortBy.dir",
    );
    expect(sortChanges).toHaveLength(1);
    expect(sortChanges[0]!.oldValue).toBe("asc");
    expect(sortChanges[0]!.newValue).toBe("desc");
  });

  it("detects groupBy added", () => {
    const before = makeSnapshot({ groupBy: null });
    const after = makeSnapshot({ groupBy: "Channel/Name" });

    const result = diffConfigs(before, after);
    const groupChanges = result.changes.filter((c) => c.category === "group");
    expect(groupChanges).toHaveLength(1);
    expect(groupChanges[0]!.changeType).toBe("added");
    expect(groupChanges[0]!.newValue).toBe("Channel/Name");
  });

  it("detects groupBy removed", () => {
    const before = makeSnapshot({ groupBy: "Channel/Name" });
    const after = makeSnapshot({ groupBy: null });

    const result = diffConfigs(before, after);
    const groupChanges = result.changes.filter((c) => c.category === "group");
    expect(groupChanges).toHaveLength(1);
    expect(groupChanges[0]!.changeType).toBe("removed");
  });

  it("detects groupBy changed", () => {
    const before = makeSnapshot({ groupBy: "Channel/Name" });
    const after = makeSnapshot({ groupBy: "Genre" });

    const result = diffConfigs(before, after);
    const groupChanges = result.changes.filter((c) => c.category === "group");
    expect(groupChanges).toHaveLength(1);
    expect(groupChanges[0]!.changeType).toBe("modified");
    expect(groupChanges[0]!.oldValue).toBe("Channel/Name");
    expect(groupChanges[0]!.newValue).toBe("Genre");
  });

  it("summary counts are correct", () => {
    const before = makeSnapshot({
      selection: { A: true },
      columns: [makeColumn("c1", "Date")],
      format: "xlsx",
    });
    const after = makeSnapshot({
      selection: { A: true, B: true },
      columns: [makeColumn("c1", "Date Modified")],
      format: "csv",
    });

    const result = diffConfigs(before, after);
    expect(result.summary.totalChanges).toBe(result.changes.length);
    expect(result.summary.added).toBe(
      result.changes.filter((c) => c.changeType === "added").length,
    );
    expect(result.summary.removed).toBe(
      result.changes.filter((c) => c.changeType === "removed").length,
    );
    expect(result.summary.modified).toBe(
      result.changes.filter((c) => c.changeType === "modified").length,
    );
  });

  it("description string is human-readable", () => {
    const before = makeSnapshot({ format: "xlsx" });
    const after = makeSnapshot({ format: "csv" });

    const result = diffConfigs(before, after);
    expect(result.description).toContain("modification");
    expect(result.description).toContain("format");
  });

  it("description is 'No changes' for identical configs", () => {
    const snap = makeSnapshot();
    const result = diffConfigs(snap, snap);
    expect(result.description).toBe("No changes");
  });

  it("change IDs are unique within a diff", () => {
    const before = makeSnapshot({
      selection: { A: true, B: true },
      columns: [makeColumn("c1", "X"), makeColumn("c2", "Y")],
      format: "xlsx",
      groupBy: null,
    });
    const after = makeSnapshot({
      selection: { C: true, D: true },
      columns: [makeColumn("c3", "Z")],
      format: "csv",
      groupBy: "Channel",
    });

    const result = diffConfigs(before, after);
    const ids = result.changes.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ─── applyChange ───────────────────────────────────────────────────────

describe("applyChange", () => {
  it("applies field addition", () => {
    const base = makeSnapshot({ selection: {} });
    const change: DiffChange = {
      id: "field-add-0",
      category: "field",
      changeType: "added",
      path: "selection.Slot/Date",
      label: 'Field "Slot/Date" added',
      newValue: "true",
    };

    const result = applyChange(base, change, "new");
    expect(result.selection["Slot/Date"]).toBe(true);
  });

  it("applies field removal", () => {
    const base = makeSnapshot({
      selection: { "Slot/Date": true },
    });
    const change: DiffChange = {
      id: "field-remove-0",
      category: "field",
      changeType: "removed",
      path: "selection.Slot/Date",
      label: 'Field "Slot/Date" removed',
      oldValue: "true",
    };

    const result = applyChange(base, change, "new");
    expect(result.selection["Slot/Date"]).toBeUndefined();
  });

  it("applies style modification", () => {
    const base = makeSnapshot({ style: baseStyle });
    const change: DiffChange = {
      id: "style-mod-headerBg",
      category: "style",
      changeType: "modified",
      path: "style.headerBg",
      label: 'Style "headerBg" changed',
      oldValue: "#1a365d",
      newValue: "#ff0000",
    };

    const result = applyChange(base, change, "new");
    expect(result.style.headerBg).toBe("#ff0000");
  });

  it("applies format change", () => {
    const base = makeSnapshot({ format: "xlsx" });
    const change: DiffChange = {
      id: "format-mod-0",
      category: "format",
      changeType: "modified",
      path: "format",
      label: 'Format changed from "xlsx" to "csv"',
      oldValue: "xlsx",
      newValue: "csv",
    };

    const result = applyChange(base, change, "new");
    expect(result.format).toBe("csv");
  });

  it("can revert format change by applying old value", () => {
    const base = makeSnapshot({ format: "csv" });
    const change: DiffChange = {
      id: "format-mod-0",
      category: "format",
      changeType: "modified",
      path: "format",
      label: 'Format changed',
      oldValue: "xlsx",
      newValue: "csv",
    };

    const result = applyChange(base, change, "old");
    expect(result.format).toBe("xlsx");
  });
});

// ─── applySelectedChanges ──────────────────────────────────────────────

describe("applySelectedChanges", () => {
  it("applies subset of changes", () => {
    const base = makeSnapshot({
      selection: { A: true },
      format: "xlsx",
    });
    const target = makeSnapshot({
      selection: { A: true, B: true },
      format: "csv",
    });

    const diff = diffConfigs(base, target);

    // Accept only the field addition, not the format change
    const fieldAddChange = diff.changes.find(
      (c) => c.category === "field" && c.changeType === "added",
    )!;
    const accepted = new Set([fieldAddChange.id]);

    const result = applySelectedChanges(base, target, diff, accepted);
    // Field B should be added
    expect(result.selection["B"]).toBe(true);
    // Format should NOT change (not accepted)
    expect(result.format).toBe("xlsx");
  });

  it("empty accepted set returns base unchanged", () => {
    const base = makeSnapshot({
      selection: { A: true },
      format: "xlsx",
    });
    const target = makeSnapshot({
      selection: { B: true },
      format: "csv",
    });

    const diff = diffConfigs(base, target);
    const result = applySelectedChanges(base, target, diff, new Set());

    expect(result.selection).toEqual(base.selection);
    expect(result.format).toBe(base.format);
  });

  it("all accepted produces same as target for field/column changes", () => {
    const base = makeSnapshot({
      selection: { A: true },
      columns: [makeColumn("c1", "Date")],
      format: "xlsx",
      groupBy: null,
    });
    const target = makeSnapshot({
      selection: { B: true },
      columns: [makeColumn("c1", "Date"), makeColumn("c2", "Title")],
      format: "csv",
      groupBy: "Channel",
    });

    const diff = diffConfigs(base, target);
    const allIds = new Set(diff.changes.map((c) => c.id));
    const result = applySelectedChanges(base, target, diff, allIds);

    // All accepted changes should produce the same result as target
    expect(result.selection["B"]).toBe(true);
    expect(result.selection["A"]).toBeUndefined();
    expect(result.format).toBe("csv");
    expect(result.groupBy).toBe("Channel");
    // Column c2 should be added
    expect(result.columns.find((c) => c.id === "c2")).toBeDefined();
  });

  it("applies sort change from target", () => {
    const base = makeSnapshot({ sortBy: null });
    const target = makeSnapshot({
      sortBy: { field: "Date", dir: "desc" },
    });

    const diff = diffConfigs(base, target);
    const allIds = new Set(diff.changes.map((c) => c.id));
    const result = applySelectedChanges(base, target, diff, allIds);

    expect(result.sortBy).toEqual({ field: "Date", dir: "desc" });
  });

  it("applies metadata changes from target", () => {
    const modMeta: ReportMetadata = {
      ...baseMetadata,
      name: "New Name",
      description: "New Description",
    };
    const base = makeSnapshot({ metadata: baseMetadata });
    const target = makeSnapshot({ metadata: modMeta });

    const diff = diffConfigs(base, target);
    const allIds = new Set(diff.changes.map((c) => c.id));
    const result = applySelectedChanges(base, target, diff, allIds);

    expect(result.metadata.name).toBe("New Name");
    expect(result.metadata.description).toBe("New Description");
  });
});
