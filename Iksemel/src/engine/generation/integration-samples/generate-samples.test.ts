/**
 * Integration sample generator.
 *
 * Produces sample XSLT files for each native format that can be run
 * through Saxon with sample-data.xml to validate the two-stage pipeline.
 * These tests verify that the generated samples are well-formed.
 */

import { describe, it, expect } from "vitest";
import { generateXlsxNativeXslt } from "../xslt-xlsx-native";
import { generateDocxNativeXslt } from "../xslt-docx-native";
import { generatePptxNativeXslt } from "../xslt-pptx-native";
import { generateOdsNativeXslt } from "../xslt-ods-native";
import { generateOdtNativeXslt } from "../xslt-odt-native";
import type { GeneratorInput, ColumnDefinition } from "@/types";

// Trigger auto-registration
import "../xslt-xlsx-native";
import "../xslt-docx-native";
import "../xslt-pptx-native";
import "../xslt-ods-native";
import "../xslt-odt-native";

const SAMPLE_COLUMNS: readonly ColumnDefinition[] = [
  { id: "c1", header: "Title", xpath: "Title", format: "text", align: "left", width: 200, fullPath: "//Programme/Title" },
  { id: "c2", header: "Channel", xpath: "Channel", format: "text", align: "left", width: 120, fullPath: "//Programme/Channel" },
  { id: "c3", header: "Date", xpath: "SlotDate", format: "text", align: "center", width: 100, fullPath: "//Programme/SlotDate" },
  { id: "c4", header: "Start", xpath: "StartTime", format: "text", align: "center", width: 80, fullPath: "//Programme/StartTime" },
  { id: "c5", header: "Duration", xpath: "Duration", format: "number", align: "right", width: 80, fullPath: "//Programme/Duration" },
  { id: "c6", header: "Genre", xpath: "Genre", format: "text", align: "left", width: 100, fullPath: "//Programme/Genre" },
];

function makeSampleInput(format: GeneratorInput["format"]): GeneratorInput {
  return {
    format,
    columns: SAMPLE_COLUMNS,
    rowSource: "//Programme",
    groupBy: "Channel",
    sortBy: { field: "StartTime", dir: "asc" },
    style: {
      name: "sample",
      headerBg: "#1a365d",
      headerFg: "#ffffff",
      altRowBg: "#f0f4f8",
      groupBg: "#e2e8f0",
      fontFamily: "Calibri, sans-serif",
      fontSize: "10",
      showTitle: true,
      showFooter: false,
      autoFilter: true,
      orientation: "landscape",
      delimiter: ",",
      quoteChar: '"',
      margins: "1in",
    },
    title: "Schedule Export",
    documentTemplate: null,
  };
}

describe("Integration sample XSLT generation", () => {
  it("generates valid XLSX-native sample", () => {
    const xslt = generateXlsxNativeXslt(makeSampleInput("xlsx-native"));
    expect(xslt).toContain('<?xml version="1.0"');
    expect(xslt).toContain("xsl:stylesheet");
    expect(xslt).toContain('select="//Programme"');
    expect(xslt).toContain("xsl:sort");
    expect(xslt).toContain("Channel");
    expect(xslt).toContain("Title");
  });

  it("generates valid DOCX-native sample", () => {
    const xslt = generateDocxNativeXslt(makeSampleInput("docx-native"));
    expect(xslt).toContain("xfeb:DocumentFragment");
    expect(xslt).toContain("w:tbl");
    expect(xslt).toContain('select="//Programme"');
  });

  it("generates valid PPTX-native sample", () => {
    const xslt = generatePptxNativeXslt(makeSampleInput("pptx-native"));
    expect(xslt).toContain("xfeb:SlideFragment");
    expect(xslt).toContain("a:tbl");
    expect(xslt).toContain("a:gridCol");
  });

  it("generates valid ODS-native sample", () => {
    const xslt = generateOdsNativeXslt(makeSampleInput("ods-native"));
    expect(xslt).toContain("xfeb:OdfFragment");
    expect(xslt).toContain("table:table");
    expect(xslt).toContain("table:table-cell");
  });

  it("generates valid ODT-native sample", () => {
    const xslt = generateOdtNativeXslt(makeSampleInput("odt-native"));
    expect(xslt).toContain("xfeb:OdfFragment");
    expect(xslt).toContain("Heading_20_1");
    expect(xslt).toContain("table:table");
  });

  it("all samples include sort blocks", () => {
    const cases = [
      { gen: generateXlsxNativeXslt, fmt: "xlsx-native" as const },
      { gen: generateDocxNativeXslt, fmt: "docx-native" as const },
      { gen: generatePptxNativeXslt, fmt: "pptx-native" as const },
      { gen: generateOdsNativeXslt, fmt: "ods-native" as const },
      { gen: generateOdtNativeXslt, fmt: "odt-native" as const },
    ];

    for (const { gen, fmt } of cases) {
      const xslt = gen(makeSampleInput(fmt));
      expect(xslt, `${fmt} should contain xsl:sort`).toContain("xsl:sort");
    }
  });

  it("tabular formats include group blocks", () => {
    // PPTX doesn't support group-break rows (no column spanning in DrawingML tables)
    const tabulars = [
      { gen: generateXlsxNativeXslt, fmt: "xlsx-native" as const },
      { gen: generateDocxNativeXslt, fmt: "docx-native" as const },
      { gen: generateOdsNativeXslt, fmt: "ods-native" as const },
      { gen: generateOdtNativeXslt, fmt: "odt-native" as const },
    ];

    for (const { gen, fmt } of tabulars) {
      const xslt = gen(makeSampleInput(fmt));
      expect(xslt, `${fmt} should contain xsl:if for grouping`).toContain("xsl:if");
    }
  });
});
