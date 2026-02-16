import { describe, it, expect } from "vitest";
import { createHistory, pushState, undo, redo, canUndo, canRedo } from "./history";

describe("SelectionHistory", () => {
  it("creates initial history with empty past and future", () => {
    const h = createHistory({});
    expect(h.past).toHaveLength(0);
    expect(h.future).toHaveLength(0);
    expect(h.present).toEqual({});
  });

  it("pushState adds current to past and sets new present", () => {
    const h = createHistory({ a: true });
    const h2 = pushState(h, { a: true, b: true });
    expect(h2.past).toHaveLength(1);
    expect(h2.past[0]).toEqual({ a: true });
    expect(h2.present).toEqual({ a: true, b: true });
    expect(h2.future).toHaveLength(0);
  });

  it("pushState clears future (redo is gone after new action)", () => {
    let h = createHistory({ a: true });
    h = pushState(h, { a: true, b: true });
    h = pushState(h, { a: true, b: true, c: true });
    h = undo(h); // now future has 1 item
    expect(h.future).toHaveLength(1);
    h = pushState(h, { d: true }); // new action clears future
    expect(h.future).toHaveLength(0);
  });

  it("undo restores previous state", () => {
    let h = createHistory({ a: true });
    h = pushState(h, { a: true, b: true });
    h = undo(h);
    expect(h.present).toEqual({ a: true });
    expect(h.future).toHaveLength(1);
  });

  it("undo does nothing when no past", () => {
    const h = createHistory({});
    const h2 = undo(h);
    expect(h2).toBe(h); // same reference
  });

  it("redo restores undone state", () => {
    let h = createHistory({ a: true });
    h = pushState(h, { a: true, b: true });
    h = undo(h);
    h = redo(h);
    expect(h.present).toEqual({ a: true, b: true });
    expect(h.future).toHaveLength(0);
  });

  it("redo does nothing when no future", () => {
    const h = createHistory({});
    const h2 = redo(h);
    expect(h2).toBe(h);
  });

  it("multiple undo/redo operations work correctly", () => {
    let h = createHistory({});
    h = pushState(h, { a: true });
    h = pushState(h, { a: true, b: true });
    h = pushState(h, { a: true, b: true, c: true });

    // Undo 3 times
    h = undo(h);
    expect(h.present).toEqual({ a: true, b: true });
    h = undo(h);
    expect(h.present).toEqual({ a: true });
    h = undo(h);
    expect(h.present).toEqual({});

    // Redo 2 times
    h = redo(h);
    expect(h.present).toEqual({ a: true });
    h = redo(h);
    expect(h.present).toEqual({ a: true, b: true });
  });

  it("respects 50-step history limit", () => {
    let h = createHistory({});
    for (let i = 0; i < 60; i++) {
      h = pushState(h, { [`item${i}`]: true });
    }
    expect(h.past.length).toBeLessThanOrEqual(50);
  });

  it("canUndo/canRedo report correctly", () => {
    let h = createHistory({});
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);

    h = pushState(h, { a: true });
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);

    h = undo(h);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(true);
  });
});
