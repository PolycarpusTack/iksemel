import { describe, it, expect } from "vitest";
import { shouldShowSizeWarning, shouldBlockExport } from "./SizeWarningModal";

const MB = 1024 * 1024;

describe("shouldShowSizeWarning", () => {
  it("returns false below 50 MB", () => {
    expect(shouldShowSizeWarning(0)).toBe(false);
    expect(shouldShowSizeWarning(49 * MB)).toBe(false);
    expect(shouldShowSizeWarning(50 * MB - 1)).toBe(false);
  });

  it("returns true at exactly 50 MB", () => {
    expect(shouldShowSizeWarning(50 * MB)).toBe(true);
  });

  it("returns true above 50 MB", () => {
    expect(shouldShowSizeWarning(100 * MB)).toBe(true);
    expect(shouldShowSizeWarning(199 * MB)).toBe(true);
  });
});

describe("shouldBlockExport", () => {
  it("returns false below 200 MB", () => {
    expect(shouldBlockExport(0)).toBe(false);
    expect(shouldBlockExport(199 * MB)).toBe(false);
    expect(shouldBlockExport(200 * MB - 1)).toBe(false);
  });

  it("returns true at exactly 200 MB", () => {
    expect(shouldBlockExport(200 * MB)).toBe(true);
  });

  it("returns true above 200 MB", () => {
    expect(shouldBlockExport(500 * MB)).toBe(true);
    expect(shouldBlockExport(1024 * MB)).toBe(true);
  });
});
