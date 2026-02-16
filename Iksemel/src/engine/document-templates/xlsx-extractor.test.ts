import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { extractXlsxStyles } from "./xlsx-extractor";

async function makeXlsxZip(stylesXml: string): Promise<JSZip> {
  const zip = new JSZip();
  zip.file("xl/styles.xml", stylesXml);
  return zip;
}

const SAMPLE_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="yyyy-mm-dd"/>
    <numFmt numFmtId="165" formatCode="#,##0.00"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><name val="Arial"/><color rgb="FF000000"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1A365D"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left/><right/><top/><bottom style="thin"><color indexed="64"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="164" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>
  </cellXfs>
</styleSheet>`;

describe("extractXlsxStyles", () => {
  it("returns null when styles.xml is missing", async () => {
    const zip = new JSZip();
    const result = await extractXlsxStyles(zip);
    expect(result).toBeNull();
  });

  it("extracts number formats", async () => {
    const zip = await makeXlsxZip(SAMPLE_STYLES);
    const styles = await extractXlsxStyles(zip);

    expect(styles?.numberFormats).toHaveLength(2);
    expect(styles?.numberFormats[0]).toEqual({ id: 164, formatCode: "yyyy-mm-dd" });
    expect(styles?.numberFormats[1]).toEqual({ id: 165, formatCode: "#,##0.00" });
  });

  it("extracts fonts", async () => {
    const zip = await makeXlsxZip(SAMPLE_STYLES);
    const styles = await extractXlsxStyles(zip);

    expect(styles?.fonts).toHaveLength(2);
    expect(styles?.fonts[0]?.name).toBe("Calibri");
    expect(styles?.fonts[0]?.size).toBe(11);
    expect(styles?.fonts[1]?.name).toBe("Arial");
    expect(styles?.fonts[1]?.size).toBe(14);
    expect(styles?.fonts[1]?.bold).toBe(true);
  });

  it("extracts fills", async () => {
    const zip = await makeXlsxZip(SAMPLE_STYLES);
    const styles = await extractXlsxStyles(zip);

    expect(styles?.fills).toHaveLength(3);
    expect(styles?.fills[0]?.patternType).toBe("none");
    expect(styles?.fills[2]?.patternType).toBe("solid");
    expect(styles?.fills[2]?.fgColor).toBe("FF1A365D");
  });

  it("extracts borders", async () => {
    const zip = await makeXlsxZip(SAMPLE_STYLES);
    const styles = await extractXlsxStyles(zip);

    expect(styles?.borders).toHaveLength(2);
    expect(styles?.borders[1]?.style).toBe("thin");
  });

  it("extracts cell styles from cellXfs", async () => {
    const zip = await makeXlsxZip(SAMPLE_STYLES);
    const styles = await extractXlsxStyles(zip);

    expect(styles?.cellStyles).toHaveLength(2);
    expect(styles?.cellStyles[1]).toEqual({
      name: "Style 1",
      fontIndex: 1,
      fillIndex: 2,
      borderIndex: 1,
      numberFormatId: 164,
    });
  });

  it("returns type spreadsheet", async () => {
    const zip = await makeXlsxZip(SAMPLE_STYLES);
    const styles = await extractXlsxStyles(zip);
    expect(styles?.type).toBe("spreadsheet");
  });
});
