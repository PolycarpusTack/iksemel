import { describe, it, expect } from "vitest";
import { escXml, validateXPath, sanitizeXPath } from "./xml";

describe("escXml", () => {
  it("escapes ampersand", () => {
    expect(escXml("AT&T")).toBe("AT&amp;T");
  });

  it("escapes less-than", () => {
    expect(escXml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes greater-than", () => {
    expect(escXml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escXml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes single quotes (apostrophe)", () => {
    expect(escXml("it's")).toBe("it&apos;s");
  });

  it("escapes all special characters in combination", () => {
    expect(escXml(`<a href="x">&'test'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&apos;test&apos;&lt;/a&gt;",
    );
  });

  it("handles null input", () => {
    expect(escXml(null)).toBe("");
  });

  it("handles undefined input", () => {
    expect(escXml(undefined)).toBe("");
  });

  it("handles empty string", () => {
    expect(escXml("")).toBe("");
  });

  it("passes through safe strings unchanged", () => {
    expect(escXml("Hello World 123")).toBe("Hello World 123");
  });

  it("handles Unicode characters", () => {
    expect(escXml("café & résumé")).toBe("café &amp; résumé");
  });

  it("handles CJK characters", () => {
    expect(escXml("日本語テスト")).toBe("日本語テスト");
  });

  it("handles emoji", () => {
    expect(escXml("test 🎉 emoji")).toBe("test 🎉 emoji");
  });
});

describe("validateXPath", () => {
  it("accepts simple element paths", () => {
    expect(validateXPath("Programme/Title")).toEqual({ valid: true });
  });

  it("accepts paths with predicates", () => {
    expect(validateXPath("Channel[1]/Schedule")).toEqual({ valid: true });
  });

  it("accepts paths with axis specifiers", () => {
    expect(validateXPath("ancestor::Channel/ChannelName")).toEqual({ valid: true });
  });

  it("accepts attribute references", () => {
    expect(validateXPath("@id")).toEqual({ valid: true });
  });

  it("accepts descendant-or-self axis", () => {
    expect(validateXPath("//Slot/Title")).toEqual({ valid: true });
  });

  it("accepts safe functions like concat()", () => {
    expect(validateXPath("concat(FirstName, ' ', LastName)")).toEqual({ valid: true });
  });

  it("accepts safe functions like string-length()", () => {
    expect(validateXPath("string-length(Title)")).toEqual({ valid: true });
  });

  it("rejects empty expressions", () => {
    const result = validateXPath("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects whitespace-only expressions", () => {
    const result = validateXPath("   ");
    expect(result.valid).toBe(false);
  });

  it("rejects document() function", () => {
    const result = validateXPath('document("http://evil.com")');
    expect(result.valid).toBe(false);
    expect(result.error).toContain("document");
  });

  it("rejects system-property() function", () => {
    const result = validateXPath('system-property("xsl:version")');
    expect(result.valid).toBe(false);
    expect(result.error).toContain("system-property");
  });

  it("rejects document() with whitespace before paren", () => {
    const result = validateXPath("document ('http://evil.com')");
    expect(result.valid).toBe(false);
  });

  it("rejects unbalanced parentheses", () => {
    const result = validateXPath("concat(a, b");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unbalanced");
  });

  it("rejects unbalanced brackets", () => {
    const result = validateXPath("Channel[1/Name");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unbalanced");
  });

  it("rejects extra closing parenthesis", () => {
    const result = validateXPath("concat(a))");
    expect(result.valid).toBe(false);
  });

  it("rejects extra closing bracket", () => {
    const result = validateXPath("Channel]");
    expect(result.valid).toBe(false);
  });
});

describe("sanitizeXPath", () => {
  it("returns valid expressions unchanged", () => {
    expect(sanitizeXPath("Programme/Title")).toBe("Programme/Title");
  });

  it("throws on unsafe expressions", () => {
    expect(() => sanitizeXPath('document("http://evil.com")')).toThrow("document");
  });

  it("throws on empty expressions", () => {
    expect(() => sanitizeXPath("")).toThrow("empty");
  });
});
