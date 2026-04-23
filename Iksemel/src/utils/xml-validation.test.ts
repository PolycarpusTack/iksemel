import { describe, expect, it } from "vitest";
import { validateXmlDocument } from "./xml-validation";

describe("validateXmlDocument", () => {
  it("validates well-formed XML", () => {
    const result = validateXmlDocument("<root><child/></root>");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("rejects malformed XML", () => {
    const result = validateXmlDocument("<root><unclosed>");
    expect(result.valid).toBe(false);
    expect(result.error).not.toBeNull();
  });

  it("rejects XML with DOCTYPE declaration", () => {
    const xml = `<?xml version="1.0"?>\n<!DOCTYPE foo [<!ENTITY xxe "test">]>\n<root>&xxe;</root>`;
    const result = validateXmlDocument(xml);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("DOCTYPE");
  });

  it("rejects billion-laughs DOCTYPE variant", () => {
    const xml = `<!DOCTYPE bomb [\n  <!ENTITY a "ha">\n  <!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">\n]><root>&b;</root>`;
    const result = validateXmlDocument(xml);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("DOCTYPE");
  });

  it("accepts XML with no DOCTYPE", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ReportDefinition>\n  <Identity><Name>Test</Name></Identity>\n</ReportDefinition>`;
    const result = validateXmlDocument(xml);
    expect(result.valid).toBe(true);
  });
});
