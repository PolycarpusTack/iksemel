import { describe, expect, it } from "vitest";
import { resolveCodeViewerMode } from "./MonacoCodeViewer";

describe("resolveCodeViewerMode", () => {
  it("defaults to classic mode", () => {
    expect(resolveCodeViewerMode(undefined)).toBe("classic");
    expect(resolveCodeViewerMode("unexpected")).toBe("classic");
  });

  it("accepts monaco mode", () => {
    expect(resolveCodeViewerMode("monaco")).toBe("monaco");
  });
});
