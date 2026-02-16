import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { extractDocxStyles } from "./docx-extractor";

async function makeDocxZip(stylesXml: string): Promise<JSZip> {
  const zip = new JSZip();
  zip.file("word/styles.xml", stylesXml);
  return zip;
}

const SAMPLE_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Georgia"/>
        <w:sz w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Georgia"/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:rPr>
      <w:rFonts w:ascii="Arial"/>
      <w:sz w:val="32"/>
      <w:b/>
    </w:rPr>
  </w:style>
</w:styles>`;

describe("extractDocxStyles", () => {
  it("returns null when styles.xml is missing", async () => {
    const zip = new JSZip();
    const result = await extractDocxStyles(zip);
    expect(result).toBeNull();
  });

  it("returns type document", async () => {
    const zip = await makeDocxZip(SAMPLE_STYLES);
    const styles = await extractDocxStyles(zip);
    expect(styles?.type).toBe("document");
  });

  it("extracts fonts from styles", async () => {
    const zip = await makeDocxZip(SAMPLE_STYLES);
    const styles = await extractDocxStyles(zip);

    // Default font + 2 style fonts
    expect(styles?.fonts.length).toBeGreaterThanOrEqual(2);
    // Default font should be Georgia (from docDefaults)
    expect(styles?.fonts[0]?.name).toBe("Georgia");
  });

  it("detects bold styles", async () => {
    const zip = await makeDocxZip(SAMPLE_STYLES);
    const styles = await extractDocxStyles(zip);

    const boldFont = styles?.fonts.find((f) => f.bold);
    expect(boldFont).toBeTruthy();
    expect(boldFont?.name).toBe("Arial");
  });

  it("handles missing docDefaults gracefully", async () => {
    const minimalStyles = `<?xml version="1.0"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>`;
    const zip = await makeDocxZip(minimalStyles);
    const styles = await extractDocxStyles(zip);

    expect(styles).not.toBeNull();
    // Should fall back to Calibri
    expect(styles?.fonts[0]?.name).toBe("Calibri");
  });
});
