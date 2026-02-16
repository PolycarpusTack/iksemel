import { describe, it, expect } from "vitest";
import { generateXlsxNativeXslt } from "./xslt-xlsx-native";
import { makeGeneratorInput } from "@/test/fixtures";

// Trigger auto-registration
import "./xslt-xlsx-native";

describe("generateXlsxNativeXslt", () => {
  it("produces well-formed XML with XML declaration", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({ format: "xlsx-native" }));
    expect(xslt).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xslt).toContain("<xsl:stylesheet");
    expect(xslt).toContain("</xsl:stylesheet>");
  });

  it("contains xfeb:SheetFragment root element", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({ format: "xlsx-native" }));
    expect(xslt).toContain("<xfeb:SheetFragment");
    expect(xslt).toContain("</xfeb:SheetFragment>");
    expect(xslt).toContain("urn:xfeb:spreadsheet-fragment:v1");
  });

  it("generates header cells with correct cell references", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({ format: "xlsx-native" }));
    // 3 test columns → A1, B1, C1
    expect(xslt).toContain('r="A1"');
    expect(xslt).toContain('r="B1"');
    expect(xslt).toContain('r="C1"');
  });

  it("generates shared string entries for headers", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({ format: "xlsx-native" }));
    expect(xslt).toContain("<xfeb:SharedStrings>");
    expect(xslt).toContain("<si><t>Date</t></si>");
    expect(xslt).toContain("<si><t>Start Time</t></si>");
    expect(xslt).toContain("<si><t>Title</t></si>");
  });

  it("indexes shared strings correctly", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({ format: "xlsx-native" }));
    // First header → shared string index 0
    expect(xslt).toContain('r="A1" t="s" s="1"><v>0</v>');
    // Second header → shared string index 1
    expect(xslt).toContain('r="B1" t="s" s="1"><v>1</v>');
    // Third header → shared string index 2
    expect(xslt).toContain('r="C1" t="s" s="1"><v>2</v>');
  });

  it("uses correct cell types for different column formats", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({ format: "xlsx-native" }));
    // Date columns use t="d"
    expect(xslt).toContain('t="d"');
    // Text columns use t="inlineStr"
    expect(xslt).toContain('t="inlineStr"');
  });

  it("includes xsl:for-each with correct row source", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({
      format: "xlsx-native",
      rowSource: "//Programme",
    }));
    expect(xslt).toContain('select="//Programme"');
  });

  it("includes sort block when sortBy is set", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({
      format: "xlsx-native",
      sortBy: { field: "StartTime", dir: "asc" },
    }));
    expect(xslt).toContain('xsl:sort');
    expect(xslt).toContain('select="StartTime"');
    expect(xslt).toContain('order="ascending"');
  });

  it("includes group-break block when groupBy is set", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({
      format: "xlsx-native",
      groupBy: "SlotDate",
    }));
    expect(xslt).toContain("xsl:if");
    expect(xslt).toContain("preceding-sibling");
    expect(xslt).toContain("SlotDate");
  });

  it("generates metadata section with title and column count", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({
      format: "xlsx-native",
      title: "My Report",
    }));
    expect(xslt).toContain("<xfeb:Title>My Report</xfeb:Title>");
    expect(xslt).toContain("<xfeb:ColumnCount>3</xfeb:ColumnCount>");
  });

  it("escapes XML special characters in headers", () => {
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({
      format: "xlsx-native",
      columns: [{
        id: "c1",
        xpath: "Title",
        header: "AT&T <Show>",
        format: "text",
        align: "left",
        width: 120,
        fullPath: "Title",
      }],
    }));
    expect(xslt).toContain("AT&amp;T &lt;Show&gt;");
  });

  it("handles many columns (beyond Z → AA, AB)", () => {
    const manyColumns = Array.from({ length: 28 }, (_, i) => ({
      id: `c${String(i)}`,
      xpath: `Field${String(i)}`,
      header: `Col ${String(i)}`,
      format: "text" as const,
      align: "left" as const,
      width: 100,
      fullPath: `Field${String(i)}`,
    }));
    const xslt = generateXlsxNativeXslt(makeGeneratorInput({
      format: "xlsx-native",
      columns: manyColumns,
    }));
    // Column 27 (0-indexed) = AB
    expect(xslt).toContain('r="AB1"');
  });

  it("rejects unsafe XPath in row source", () => {
    expect(() =>
      generateXlsxNativeXslt(makeGeneratorInput({
        format: "xlsx-native",
        rowSource: 'document("http://evil")',
      })),
    ).toThrow("Unsafe XPath");
  });
});
