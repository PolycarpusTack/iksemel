/**
 * Tests for all native format XSLT generators (DOCX, PPTX, ODS, ODT).
 * Follows the same pattern as xslt-xlsx-native.test.ts.
 */

import { describe, it, expect } from "vitest";
import { generateDocxNativeXslt } from "./xslt-docx-native";
import { generatePptxNativeXslt } from "./xslt-pptx-native";
import { generateOdsNativeXslt } from "./xslt-ods-native";
import { generateOdtNativeXslt } from "./xslt-odt-native";
import { makeGeneratorInput } from "@/test/fixtures";

// Trigger auto-registration
import "./xslt-docx-native";
import "./xslt-pptx-native";
import "./xslt-ods-native";
import "./xslt-odt-native";

// ─── DOCX-native ────────────────────────────────────────────────────────

describe("generateDocxNativeXslt", () => {
  it("produces well-formed XSLT with XML declaration", () => {
    const xslt = generateDocxNativeXslt(makeGeneratorInput({ format: "docx-native" }));
    expect(xslt).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xslt).toContain("<xsl:stylesheet");
    expect(xslt).toContain("</xsl:stylesheet>");
  });

  it("contains xfeb:DocumentFragment root", () => {
    const xslt = generateDocxNativeXslt(makeGeneratorInput({ format: "docx-native" }));
    expect(xslt).toContain("<xfeb:DocumentFragment");
    expect(xslt).toContain("</xfeb:DocumentFragment>");
  });

  it("generates w:tbl with header row", () => {
    const xslt = generateDocxNativeXslt(makeGeneratorInput({ format: "docx-native" }));
    expect(xslt).toContain("<w:tbl>");
    expect(xslt).toContain("<w:tc>");
    expect(xslt).toContain("Date");
  });

  it("uses xsl:for-each with row source", () => {
    const xslt = generateDocxNativeXslt(makeGeneratorInput({
      format: "docx-native",
      rowSource: "//Programme",
    }));
    expect(xslt).toContain('select="//Programme"');
  });

  it("includes sort block when configured", () => {
    const xslt = generateDocxNativeXslt(makeGeneratorInput({
      format: "docx-native",
      sortBy: { field: "Title", dir: "desc" },
    }));
    expect(xslt).toContain("xsl:sort");
    expect(xslt).toContain('order="descending"');
  });

  it("includes group block when configured", () => {
    const xslt = generateDocxNativeXslt(makeGeneratorInput({
      format: "docx-native",
      groupBy: "Channel",
    }));
    expect(xslt).toContain("xsl:if");
    expect(xslt).toContain("w:gridSpan");
  });
});

// ─── PPTX-native ────────────────────────────────────────────────────────

describe("generatePptxNativeXslt", () => {
  it("produces well-formed XSLT", () => {
    const xslt = generatePptxNativeXslt(makeGeneratorInput({ format: "pptx-native" }));
    expect(xslt).toContain("<xsl:stylesheet");
    expect(xslt).toContain("</xsl:stylesheet>");
  });

  it("contains xfeb:SlideFragment root", () => {
    const xslt = generatePptxNativeXslt(makeGeneratorInput({ format: "pptx-native" }));
    expect(xslt).toContain("<xfeb:SlideFragment");
    expect(xslt).toContain("</xfeb:SlideFragment>");
  });

  it("generates a:tbl with grid columns", () => {
    const xslt = generatePptxNativeXslt(makeGeneratorInput({ format: "pptx-native" }));
    expect(xslt).toContain("<a:tbl>");
    expect(xslt).toContain("<a:tblGrid>");
    expect(xslt).toContain("<a:gridCol");
  });

  it("generates header cells with DrawingML markup", () => {
    const xslt = generatePptxNativeXslt(makeGeneratorInput({ format: "pptx-native" }));
    expect(xslt).toContain("<a:tc>");
    expect(xslt).toContain("<a:txBody>");
    expect(xslt).toContain("Date");
  });

  it("includes EMU column widths", () => {
    const xslt = generatePptxNativeXslt(makeGeneratorInput({ format: "pptx-native" }));
    // Column widths converted from pixels to EMU
    expect(xslt).toMatch(/a:gridCol w="\d+"/);
  });
});

// ─── ODS-native ─────────────────────────────────────────────────────────

describe("generateOdsNativeXslt", () => {
  it("produces well-formed XSLT", () => {
    const xslt = generateOdsNativeXslt(makeGeneratorInput({ format: "ods-native" }));
    expect(xslt).toContain("<xsl:stylesheet");
    expect(xslt).toContain("</xsl:stylesheet>");
  });

  it("contains xfeb:OdfFragment root", () => {
    const xslt = generateOdsNativeXslt(makeGeneratorInput({ format: "ods-native" }));
    expect(xslt).toContain("<xfeb:OdfFragment");
    expect(xslt).toContain("</xfeb:OdfFragment>");
  });

  it("generates table:table with ODF namespaces", () => {
    const xslt = generateOdsNativeXslt(makeGeneratorInput({ format: "ods-native" }));
    expect(xslt).toContain("<table:table");
    expect(xslt).toContain("<table:table-column");
    expect(xslt).toContain("<table:table-row");
    expect(xslt).toContain("<table:table-cell");
  });

  it("generates header cells with text:p", () => {
    const xslt = generateOdsNativeXslt(makeGeneratorInput({ format: "ods-native" }));
    expect(xslt).toContain("<text:p>Date</text:p>");
  });

  it("uses correct value types", () => {
    const xslt = generateOdsNativeXslt(makeGeneratorInput({ format: "ods-native" }));
    expect(xslt).toContain('office:value-type="string"');
  });
});

// ─── ODT-native ─────────────────────────────────────────────────────────

describe("generateOdtNativeXslt", () => {
  it("produces well-formed XSLT", () => {
    const xslt = generateOdtNativeXslt(makeGeneratorInput({ format: "odt-native" }));
    expect(xslt).toContain("<xsl:stylesheet");
    expect(xslt).toContain("</xsl:stylesheet>");
  });

  it("contains xfeb:OdfFragment root", () => {
    const xslt = generateOdtNativeXslt(makeGeneratorInput({ format: "odt-native" }));
    expect(xslt).toContain("<xfeb:OdfFragment");
  });

  it("generates heading paragraph for title", () => {
    const xslt = generateOdtNativeXslt(makeGeneratorInput({
      format: "odt-native",
      title: "My Report",
    }));
    expect(xslt).toContain("Heading_20_1");
    expect(xslt).toContain("My Report");
  });

  it("generates table:table with text-style cells", () => {
    const xslt = generateOdtNativeXslt(makeGeneratorInput({ format: "odt-native" }));
    expect(xslt).toContain("<table:table");
    expect(xslt).toContain("Table_20_Contents");
    expect(xslt).toContain("Table_20_Heading");
  });
});
