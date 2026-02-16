import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { postProcessXlsx } from "./post-processor-xlsx";
import { makeDocumentTemplate } from "@/test/fixtures";
import type { PostProcessInput } from "./post-processor-registry";

// Trigger auto-registration
import "./post-processor-xlsx";

/**
 * Minimal xfeb:SheetFragment XML that the XSLT generator would produce.
 */
const SAMPLE_FRAGMENT = `<?xml version="1.0" encoding="UTF-8"?>
<xfeb:SheetFragment xmlns:xfeb="urn:xfeb:spreadsheet-fragment:v1">
  <xfeb:Rows>
    <row r="1">
      <c r="A1" t="s" s="1"><v>0</v></c>
      <c r="B1" t="s" s="1"><v>1</v></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr" s="2"><is><t>Hello</t></is></c>
      <c r="B2" t="n" s="2"><v>42</v></c>
    </row>
  </xfeb:Rows>
  <xfeb:SharedStrings>
    <si><t>Name</t></si>
    <si><t>Value</t></si>
  </xfeb:SharedStrings>
  <xfeb:Metadata>
    <xfeb:Title>Test Report</xfeb:Title>
    <xfeb:ColumnCount>2</xfeb:ColumnCount>
  </xfeb:Metadata>
</xfeb:SheetFragment>`;

function makeInput(overrides: Partial<PostProcessInput> = {}): PostProcessInput {
  return {
    xsltOutput: SAMPLE_FRAGMENT,
    template: makeDocumentTemplate(),
    title: "Test Report",
    author: "Test Author",
    ...overrides,
  };
}

describe("postProcessXlsx", () => {
  it("produces a Uint8Array result", async () => {
    const result = await postProcessXlsx(makeInput());
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("returns correct MIME type and extension", async () => {
    const result = await postProcessXlsx(makeInput());
    expect(result.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(result.extension).toBe(".xlsx");
  });

  it("produces valid ZIP that can be reopened", async () => {
    const result = await postProcessXlsx(makeInput());
    const zip = await JSZip.loadAsync(result.data);
    expect(zip.file("[Content_Types].xml")).toBeTruthy();
    expect(zip.file("xl/workbook.xml")).toBeTruthy();
  });

  it("contains all required OOXML parts", async () => {
    const result = await postProcessXlsx(makeInput());
    const zip = await JSZip.loadAsync(result.data);

    const files = Object.keys(zip.files);
    expect(files).toContain("[Content_Types].xml");
    expect(files).toContain("xl/workbook.xml");
    expect(files).toContain("xl/worksheets/sheet1.xml");
    expect(files).toContain("xl/styles.xml");
    expect(files).toContain("xl/sharedStrings.xml");
    expect(files).toContain("docProps/core.xml");
  });

  it("merges sheet data into sheet1.xml", async () => {
    const result = await postProcessXlsx(makeInput());
    const zip = await JSZip.loadAsync(result.data);
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");

    expect(sheetXml).toContain("<sheetData>");
    expect(sheetXml).toContain('r="A1"');
    expect(sheetXml).toContain('r="B1"');
    expect(sheetXml).toContain("Hello");
    expect(sheetXml).toContain("<v>42</v>");
  });

  it("merges shared strings", async () => {
    const result = await postProcessXlsx(makeInput());
    const zip = await JSZip.loadAsync(result.data);
    const sstXml = await zip.file("xl/sharedStrings.xml")!.async("string");

    expect(sstXml).toContain('count="2"');
    expect(sstXml).toContain("<t>Name</t>");
    expect(sstXml).toContain("<t>Value</t>");
  });

  it("sets core properties (title, author)", async () => {
    const result = await postProcessXlsx(makeInput({
      title: "My Title",
      author: "My Author",
    }));
    const zip = await JSZip.loadAsync(result.data);
    const coreXml = await zip.file("docProps/core.xml")!.async("string");

    expect(coreXml).toContain("<dc:title>My Title</dc:title>");
    expect(coreXml).toContain("<dc:creator>My Author</dc:creator>");
  });

  it("escapes special characters in core properties", async () => {
    const result = await postProcessXlsx(makeInput({
      title: "AT&T <Report>",
      author: "O'Brien",
    }));
    const zip = await JSZip.loadAsync(result.data);
    const coreXml = await zip.file("docProps/core.xml")!.async("string");

    expect(coreXml).toContain("AT&amp;T &lt;Report&gt;");
    expect(coreXml).toContain("O&apos;Brien");
  });

  it("throws on malformed XSLT output", async () => {
    await expect(
      postProcessXlsx(makeInput({ xsltOutput: "<not valid xml>>>" })),
    ).rejects.toThrow("Failed to parse");
  });
});
