import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { DEFAULT_XLSX_SCAFFOLD, DEFAULT_DOCX_SCAFFOLD } from "./default-scaffolds";
import type { TemplateZipEntry } from "@/types";

/**
 * Helper: assembles a scaffold into a ZIP and verifies it's valid.
 */
async function assembleAndVerify(
  scaffold: readonly TemplateZipEntry[],
): Promise<JSZip> {
  const zip = new JSZip();
  for (const entry of scaffold) {
    zip.file(entry.path, entry.content);
  }
  const binary = await zip.generateAsync({ type: "uint8array" });
  expect(binary.length).toBeGreaterThan(0);
  // Verify we can re-open the generated ZIP
  const reopened = await JSZip.loadAsync(binary);
  return reopened;
}

describe("DEFAULT_XLSX_SCAFFOLD", () => {
  it("contains required OOXML parts", () => {
    const paths = DEFAULT_XLSX_SCAFFOLD.map((e) => e.path);
    expect(paths).toContain("[Content_Types].xml");
    expect(paths).toContain("_rels/.rels");
    expect(paths).toContain("xl/workbook.xml");
    expect(paths).toContain("xl/styles.xml");
    expect(paths).toContain("xl/sharedStrings.xml");
    expect(paths).toContain("xl/worksheets/sheet1.xml");
    expect(paths).toContain("docProps/core.xml");
  });

  it("marks sheet1.xml as data target", () => {
    const sheetEntry = DEFAULT_XLSX_SCAFFOLD.find(
      (e) => e.path === "xl/worksheets/sheet1.xml",
    );
    expect(sheetEntry?.isDataTarget).toBe(true);
  });

  it("produces valid ZIP when assembled", async () => {
    const zip = await assembleAndVerify(DEFAULT_XLSX_SCAFFOLD);
    expect(zip.file("[Content_Types].xml")).toBeTruthy();
    expect(zip.file("xl/workbook.xml")).toBeTruthy();
    expect(zip.file("xl/worksheets/sheet1.xml")).toBeTruthy();
  });

  it("all entries have utf-8 encoding", () => {
    for (const entry of DEFAULT_XLSX_SCAFFOLD) {
      expect(entry.encoding).toBe("utf-8");
    }
  });
});

describe("DEFAULT_DOCX_SCAFFOLD", () => {
  it("contains required OOXML parts", () => {
    const paths = DEFAULT_DOCX_SCAFFOLD.map((e) => e.path);
    expect(paths).toContain("[Content_Types].xml");
    expect(paths).toContain("_rels/.rels");
    expect(paths).toContain("word/document.xml");
    expect(paths).toContain("word/styles.xml");
    expect(paths).toContain("docProps/core.xml");
  });

  it("marks document.xml as data target", () => {
    const docEntry = DEFAULT_DOCX_SCAFFOLD.find(
      (e) => e.path === "word/document.xml",
    );
    expect(docEntry?.isDataTarget).toBe(true);
  });

  it("produces valid ZIP when assembled", async () => {
    const zip = await assembleAndVerify(DEFAULT_DOCX_SCAFFOLD);
    expect(zip.file("[Content_Types].xml")).toBeTruthy();
    expect(zip.file("word/document.xml")).toBeTruthy();
  });
});
