import { describe, expect, it } from "vitest";
import { validateXmlDocument } from "./xml-validation";

describe("validateXmlDocument", () => {
  it("returns valid for well-formed XML", () => {
    const result = validateXmlDocument("<root><value>ok</value></root>");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    expect(result.doc.documentElement.nodeName).toBe("root");
  });

  it("returns parse error for malformed XML", () => {
    const result = validateXmlDocument("<root><value></root>");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
