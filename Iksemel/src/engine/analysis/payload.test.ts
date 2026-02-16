import { describe, it, expect } from "vitest";
import {
  estimateWeight,
  estimateSelectedWeight,
  computeReduction,
  detectPayloadExplosions,
} from "./payload";
import { makeLeaf, makeContainer } from "@/test/fixtures";

describe("estimateWeight", () => {
  it("estimates leaf node weight by type", () => {
    expect(estimateWeight(makeLeaf("a", "A", "string"))).toBe(40);
    expect(estimateWeight(makeLeaf("b", "B", "dateTime"))).toBe(25);
    expect(estimateWeight(makeLeaf("c", "C", "boolean"))).toBe(5);
    expect(estimateWeight(makeLeaf("d", "D", "integer"))).toBe(5);
  });

  it("multiplies by maxOccurs for repeating elements", () => {
    expect(estimateWeight(makeLeaf("a", "A", "string", "unbounded"))).toBe(40 * 50);
  });

  it("adds container overhead", () => {
    const container = makeContainer("c", "C", [makeLeaf("a", "A", "string")]);
    // children weight (40) + overhead (30) = 70
    expect(estimateWeight(container)).toBe(70);
  });

  it("supports multiplier overrides", () => {
    const node = makeLeaf("a", "A", "string", "unbounded");
    const weight = estimateWeight(node, { multiplierOverrides: { a: 200 } });
    expect(weight).toBe(40 * 200);
  });
});

describe("estimateSelectedWeight", () => {
  it("returns 0 for unselected node", () => {
    const node = makeLeaf("a", "A", "string");
    expect(estimateSelectedWeight(node, {})).toBe(0);
  });

  it("returns weight for selected leaf", () => {
    const node = makeLeaf("a", "A", "string");
    expect(estimateSelectedWeight(node, { a: true })).toBe(40);
  });

  it("only counts selected children in container", () => {
    const container = makeContainer("c", "C", [
      makeLeaf("a", "A", "string"),
      makeLeaf("b", "B", "string"),
    ]);
    // Only a is selected: max(40, 30) = 40
    expect(estimateSelectedWeight(container, { c: true, a: true })).toBe(40);
  });
});

describe("computeReduction", () => {
  it("returns 100 for empty selection (nothing selected = max reduction)", () => {
    const tree = makeContainer("r", "R", [makeLeaf("a", "A", "string")]);
    // No selected weight, so reduction = 100%
    expect(computeReduction([tree], {})).toBe(100);
  });

  it("returns low reduction for full selection", () => {
    const tree = makeLeaf("a", "A", "string");
    // Selected weight equals total weight, so reduction = 0%
    expect(computeReduction([tree], { a: true })).toBe(0);
  });

  it("computes reduction for partial selection", () => {
    const tree = makeContainer("r", "R", [
      makeLeaf("a", "A", "string"),
      makeLeaf("b", "B", "string"),
      makeLeaf("c", "C", "string"),
    ]);
    // Total: 3*40 + 30 = 150. Selected a only: max(40, 30) = 40
    const pct = computeReduction([tree], { r: true, a: true });
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });
});

describe("detectPayloadExplosions", () => {
  it("detects high-contribution repeating elements", () => {
    const tree = makeContainer("r", "R", [
      makeLeaf("a", "A", "string"),
      makeContainer(
        "rep",
        "Rep",
        [makeLeaf("b", "B", "string")],
        "unbounded",
      ),
    ]);
    const sel = { r: true, a: true, rep: true, b: true };
    const explosions = detectPayloadExplosions([tree], sel);
    expect(explosions.length).toBeGreaterThan(0);
    expect(explosions[0]?.nodeName).toBe("Rep");
  });

  it("returns empty for no repeating elements", () => {
    const tree = makeContainer("r", "R", [makeLeaf("a", "A", "string")]);
    const sel = { r: true, a: true };
    expect(detectPayloadExplosions([tree], sel)).toHaveLength(0);
  });

  it("respects custom threshold", () => {
    const tree = makeContainer("r", "R", [
      makeLeaf("a", "A", "string", "unbounded"),
    ]);
    const sel = { r: true, a: true };
    // With 100% threshold, nothing should trigger
    expect(detectPayloadExplosions([tree], sel, {}, 101)).toHaveLength(0);
  });
});
