import { describe, it, expect } from "vitest";
import { analyzeFilterEfficiency, simulateFilterImpact } from "./efficiency";
import type { SchemaNode } from "@/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeLeaf(
  id: string,
  name: string,
  typeName = "string",
  maxOccurs = "1",
): SchemaNode {
  return {
    id,
    name,
    documentation: "",
    minOccurs: "1",
    maxOccurs,
    type: "simple",
    typeName,
    children: [],
    isRequired: true,
  };
}

function makeContainer(
  id: string,
  name: string,
  children: SchemaNode[],
  maxOccurs = "1",
): SchemaNode {
  return {
    id,
    name,
    documentation: "",
    minOccurs: "1",
    maxOccurs,
    type: "complex",
    typeName: "",
    children,
    isRequired: true,
  };
}

// ─── analyzeFilterEfficiency ─────────────────────────────────────────────────

describe("analyzeFilterEfficiency", () => {
  it("tight selection gets B or A grade", () => {
    // 10 leaf nodes total, select only 2 → ratio ~0.2 (< 0.3 threshold)
    // Scoring: base 70 + 20 (tight ratio) + 10 (no explosions) + 0 (no repeating) + 0 (no orphans) = 100 → A
    const leaves = Array.from({ length: 10 }, (_, i) =>
      makeLeaf(`n${i}`, `Field${i}`),
    );
    const roots = [makeContainer("root", "Root", leaves)];
    const selection = { root: true, n0: true, n1: true };

    const result = analyzeFilterEfficiency(roots, selection);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(["A", "B"]).toContain(result.grade);
  });

  it("near-total selection gets D or F grade", () => {
    // Select > 90% of nodes → selectionImpact = -40
    // Also create unbounded repeating elements to add -20 penalty
    // Scoring: base 70 - 40 (>90% selected) - 20 (unfiltered repeating) = 10 → F
    const leaves = Array.from({ length: 5 }, (_, i) =>
      makeLeaf(`n${i}`, `Field${i}`, "string", "unbounded"),
    );
    const roots = [makeContainer("root", "Root", leaves)];
    // Select all nodes (100% selection ratio = 6 of 6 nodes)
    const selection: Record<string, boolean> = { root: true };
    for (let i = 0; i < 5; i++) selection[`n${i}`] = true;

    const result = analyzeFilterEfficiency(roots, selection);

    expect(result.score).toBeLessThan(70);
    expect(["D", "F"]).toContain(result.grade);
  });

  it("score is clamped to 0 minimum", () => {
    // Worst case: >90% selection (-40) + unfiltered repeating (-20) + explosion penalty (-30)
    // = 70 - 40 - 20 - 30 = -20 → should clamp to 0
    const manyRepeating = Array.from({ length: 20 }, (_, i) =>
      makeLeaf(`n${i}`, `Field${i}`, "string", "unbounded"),
    );
    const roots = [makeContainer("root", "Root", manyRepeating)];
    const selection: Record<string, boolean> = { root: true };
    for (let i = 0; i < 20; i++) selection[`n${i}`] = true;

    const result = analyzeFilterEfficiency(roots, selection);

    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("score is clamped to 100 maximum", () => {
    // Best case: tight selection (<30%) + no explosions
    // base 70 + 20 + 10 = 100, Math.min ensures it doesn't exceed 100
    const leaves = Array.from({ length: 20 }, (_, i) =>
      makeLeaf(`n${i}`, `Field${i}`),
    );
    const roots = [makeContainer("root", "Root", leaves)];
    // Select only 1 of 21 nodes → ~4.8% ratio (well under 30%)
    const selection = { root: true, n0: true };

    const result = analyzeFilterEfficiency(roots, selection);

    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("empty roots array does not throw", () => {
    const result = analyzeFilterEfficiency([], {});

    expect(result).toBeDefined();
    expect(typeof result.score).toBe("number");
    expect(result.grade).toBeDefined();
    expect(Array.isArray(result.factors)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it("empty selection does not throw", () => {
    const leaves = [makeLeaf("n0", "Field0"), makeLeaf("n1", "Field1")];
    const roots = [makeContainer("root", "Root", leaves)];

    const result = analyzeFilterEfficiency(roots, {});

    expect(result).toBeDefined();
    expect(typeof result.score).toBe("number");
  });

  describe("grade boundaries", () => {
    it("returns grade A for score >= 90", () => {
      // Tight selection + no explosions: 70 + 20 + 10 = 100 → A
      const leaves = Array.from({ length: 20 }, (_, i) =>
        makeLeaf(`n${i}`, `Field${i}`),
      );
      const roots = [makeContainer("root", "Root", leaves)];
      const selection = { root: true, n0: true }; // ~4.8% selected

      const result = analyzeFilterEfficiency(roots, selection);

      expect(result.grade).toBe("A");
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it("returns grade D or F for score < 70", () => {
      // >90% selection (-40) + unfiltered repeating (-20) → 70 - 60 = 10 → F
      const leaves = Array.from({ length: 5 }, (_, i) =>
        makeLeaf(`n${i}`, `Field${i}`, "string", "unbounded"),
      );
      const roots = [makeContainer("root", "Root", leaves)];
      const selection: Record<string, boolean> = { root: true };
      for (let i = 0; i < 5; i++) selection[`n${i}`] = true;

      const result = analyzeFilterEfficiency(roots, selection);

      expect(["D", "F"]).toContain(result.grade);
      expect(result.score).toBeLessThan(70);
    });
  });
});

// ─── simulateFilterImpact ────────────────────────────────────────────────────

describe("simulateFilterImpact", () => {
  it("identical before/after selection returns 0 reduction", () => {
    const leaves = [makeLeaf("n0", "Field0"), makeLeaf("n1", "Field1")];
    const roots = [makeContainer("root", "Root", leaves)];
    const selection = { root: true, n0: true, n1: true };

    const result = simulateFilterImpact(roots, selection, selection);

    expect(result.reductionBytes).toBe(0);
    expect(result.reductionPct).toBe(0);
  });

  it("removing a node reduces both bytes and pct", () => {
    const leaves = [makeLeaf("n0", "Field0"), makeLeaf("n1", "Field1")];
    const roots = [makeContainer("root", "Root", leaves)];
    const before = { root: true, n0: true, n1: true };
    const after = { root: true, n0: true }; // n1 removed

    const result = simulateFilterImpact(roots, before, after);

    expect(result.reductionBytes).toBeGreaterThan(0);
    expect(result.reductionPct).toBeGreaterThan(0);
  });

  it("empty before selection — reductionPct is 0, not NaN", () => {
    const leaves = [makeLeaf("n0", "Field0")];
    const roots = [makeContainer("root", "Root", leaves)];
    const emptySelection = {};
    const afterSelection = {}; // same (or different — sizeBefore is 0 either way)

    const result = simulateFilterImpact(roots, emptySelection, afterSelection);

    expect(Number.isFinite(result.reductionPct)).toBe(true);
  });
});
