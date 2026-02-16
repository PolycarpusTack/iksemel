import { describe, it, expect } from "vitest";
import { columnIndexToLetter, cellRef } from "./xslt-ooxml-shared";

describe("columnIndexToLetter", () => {
  it("converts 0 to A", () => {
    expect(columnIndexToLetter(0)).toBe("A");
  });

  it("converts 25 to Z", () => {
    expect(columnIndexToLetter(25)).toBe("Z");
  });

  it("converts 26 to AA", () => {
    expect(columnIndexToLetter(26)).toBe("AA");
  });

  it("converts 27 to AB", () => {
    expect(columnIndexToLetter(27)).toBe("AB");
  });

  it("converts 51 to AZ", () => {
    expect(columnIndexToLetter(51)).toBe("AZ");
  });

  it("converts 52 to BA", () => {
    expect(columnIndexToLetter(52)).toBe("BA");
  });

  it("converts 701 to ZZ", () => {
    expect(columnIndexToLetter(701)).toBe("ZZ");
  });

  it("converts 702 to AAA", () => {
    expect(columnIndexToLetter(702)).toBe("AAA");
  });
});

describe("cellRef", () => {
  it("builds A1 reference", () => {
    expect(cellRef(0, 1)).toBe("A1");
  });

  it("builds Z10 reference", () => {
    expect(cellRef(25, 10)).toBe("Z10");
  });

  it("builds AA1 reference", () => {
    expect(cellRef(26, 1)).toBe("AA1");
  });
});
