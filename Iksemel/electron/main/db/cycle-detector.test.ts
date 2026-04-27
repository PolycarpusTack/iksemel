// @vitest-environment node
import { describe, it, expect } from "vitest";
import { detectCycles } from "./cycle-detector";
import type { ForeignKeyRelation } from "../../preload/api";

function fk(
  fkId: string,
  from: string,
  to: string,
  extra: Partial<ForeignKeyRelation> = {},
): ForeignKeyRelation {
  return {
    fkId,
    fromTableId: from,
    fromColumn: "id",
    toTableId: to,
    toColumn: "id",
    isComposite: false,
    isSelfRef: from === to,
    isCircular: false,
    ...extra,
  };
}

describe("detectCycles", () => {
  it("returns empty array for empty input", () => {
    expect(detectCycles([])).toEqual([]);
  });

  it("does not mark a straight chain A→B→C as circular", () => {
    const fks = [fk("f1", "A", "B"), fk("f2", "B", "C")];
    const result = detectCycles(fks);
    expect(result.every((f) => !f.isCircular)).toBe(true);
  });

  it("marks the closing edge in A→B→C→A as circular", () => {
    const fks = [fk("f1", "A", "B"), fk("f2", "B", "C"), fk("f3", "C", "A")];
    const result = detectCycles(fks);
    const circular = result.filter((f) => f.isCircular);
    expect(circular).toHaveLength(1);
    expect(circular[0].fkId).toBe("f3");
  });

  it("marks the closing edge in A→B, B→A (two-node cycle)", () => {
    const fks = [fk("f1", "A", "B"), fk("f2", "B", "A")];
    const result = detectCycles(fks);
    const circular = result.filter((f) => f.isCircular);
    expect(circular).toHaveLength(1);
    expect(circular[0].fkId).toBe("f2");
  });

  it("marks self-referential FK (A→A) as circular", () => {
    const fks = [fk("f1", "A", "A", { isSelfRef: true })];
    const result = detectCycles(fks);
    // Self-ref is circular but handled separately in UI — still flagged
    expect(result[0].isCircular).toBe(true);
  });

  it("handles two independent cycles without cross-contamination", () => {
    const fks = [
      fk("f1", "A", "B"),
      fk("f2", "B", "A"), // cycle 1
      fk("f3", "C", "D"),
      fk("f4", "D", "C"), // cycle 2
      fk("f5", "E", "F"), // no cycle
    ];
    const result = detectCycles(fks);
    const circular = result.filter((f) => f.isCircular).map((f) => f.fkId);
    expect(circular).toContain("f2");
    expect(circular).toContain("f4");
    expect(circular).not.toContain("f1");
    expect(circular).not.toContain("f3");
    expect(circular).not.toContain("f5");
  });
});
