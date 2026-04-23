import { describe, expect, it } from "vitest";
import { computeVirtualRange } from "./useVirtualTree";

describe("computeVirtualRange", () => {
  it("returns empty range for empty collections", () => {
    const range = computeVirtualRange({
      itemCount: 0,
      rowHeight: 32,
      scrollTop: 0,
      containerHeight: 320,
      overscan: 20,
    });

    expect(range).toEqual({ startIdx: 0, endIdx: 0 });
  });

  it("computes bounded start/end indexes", () => {
    const range = computeVirtualRange({
      itemCount: 1000,
      rowHeight: 32,
      scrollTop: 640,
      containerHeight: 320,
      overscan: 10,
    });

    expect(range).toEqual({ startIdx: 10, endIdx: 40 });
  });

  it("clamps the end index at itemCount", () => {
    const range = computeVirtualRange({
      itemCount: 15,
      rowHeight: 32,
      scrollTop: 448,
      containerHeight: 320,
      overscan: 10,
    });

    expect(range).toEqual({ startIdx: 4, endIdx: 15 });
  });
});
