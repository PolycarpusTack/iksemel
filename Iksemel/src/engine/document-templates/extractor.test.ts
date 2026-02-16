import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { extractDocumentTemplate } from "./extractor";

/**
 * Helper: creates a minimal valid XLSX ZIP as ArrayBuffer.
 */
async function makeMinimalXlsx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></sheets></workbook>`);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>`);
  zip.file("xl/styles.xml", `<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs></styleSheet>`);

  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return buffer;
}

/**
 * Helper: creates a minimal valid DOCX ZIP as ArrayBuffer.
 */
async function makeMinimalDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`);
  zip.file("word/styles.xml", `<?xml version="1.0"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`);

  return zip.generateAsync({ type: "arraybuffer" });
}

describe("extractDocumentTemplate", () => {
  it("extracts an XLSX template with correct format", async () => {
    const buffer = await makeMinimalXlsx();
    const template = await extractDocumentTemplate(buffer, "test.xlsx");

    expect(template.sourceFormat).toBe("xlsx");
    expect(template.targetFormat).toBe("xlsx-native");
    expect(template.name).toBe("test");
    expect(template.originalFilename).toBe("test.xlsx");
    expect(template.injectionTarget).toBe("xl/worksheets/sheet1.xml");
  });

  it("extracts a DOCX template with correct format", async () => {
    const buffer = await makeMinimalDocx();
    const template = await extractDocumentTemplate(buffer, "report.docx");

    expect(template.sourceFormat).toBe("docx");
    expect(template.targetFormat).toBe("docx-native");
    expect(template.name).toBe("report");
  });

  it("generates a unique template ID", async () => {
    const buffer = await makeMinimalXlsx();
    const t1 = await extractDocumentTemplate(buffer, "test.xlsx");
    const t2 = await extractDocumentTemplate(buffer, "test.xlsx");

    expect(t1.id).not.toBe(t2.id);
    expect(t1.id).toMatch(/^tmpl-/);
  });

  it("extracts scaffold entries from the ZIP", async () => {
    const buffer = await makeMinimalXlsx();
    const template = await extractDocumentTemplate(buffer, "test.xlsx");

    expect(template.scaffoldEntries.length).toBeGreaterThan(0);
    const paths = template.scaffoldEntries.map((e) => e.path);
    expect(paths).toContain("[Content_Types].xml");
    expect(paths).toContain("xl/workbook.xml");
  });

  it("extracts XLSX styles", async () => {
    const buffer = await makeMinimalXlsx();
    const template = await extractDocumentTemplate(buffer, "test.xlsx");

    expect(template.extractedStyles).not.toBeNull();
    expect(template.extractedStyles?.type).toBe("spreadsheet");
    expect(template.extractedStyles?.fonts.length).toBeGreaterThan(0);
  });

  it("rejects unsupported file extension", async () => {
    const buffer = await makeMinimalXlsx();
    await expect(
      extractDocumentTemplate(buffer, "test.pdf"),
    ).rejects.toThrow("Unsupported file format");
  });

  it("rejects non-ZIP files", async () => {
    const buffer = new ArrayBuffer(100);
    await expect(
      extractDocumentTemplate(buffer, "test.xlsx"),
    ).rejects.toThrow("not a valid ZIP");
  });

  it("rejects files containing macros", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>`);
    zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file("xl/workbook.xml", `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1"/></sheets></workbook>`);
    zip.file("vbaProject.bin", "macro content");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });

    await expect(
      extractDocumentTemplate(buffer, "macro.xlsx"),
    ).rejects.toThrow("macros");
  });

  it("rejects files with missing required parts", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`);
    // Missing xl/workbook.xml
    const buffer = await zip.generateAsync({ type: "arraybuffer" });

    await expect(
      extractDocumentTemplate(buffer, "bad.xlsx"),
    ).rejects.toThrow("missing required part");
  });

  it("sets uploadedAt timestamp", async () => {
    const before = new Date().toISOString();
    const buffer = await makeMinimalXlsx();
    const template = await extractDocumentTemplate(buffer, "test.xlsx");
    const after = new Date().toISOString();

    expect(template.uploadedAt >= before).toBe(true);
    expect(template.uploadedAt <= after).toBe(true);
  });
});
