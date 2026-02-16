/**
 * DOCX-specific style extractor.
 *
 * Parses word/styles.xml and word/document.xml via DOMParser to extract
 * paragraph styles, table styles, default font, and page layout properties.
 */

import type JSZip from "jszip";
import type { ExtractedStyles } from "@/types";

const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * Extracts styles from a DOCX ZIP.
 *
 * @param zip - JSZip instance of the uploaded DOCX file
 * @returns Extracted document styles, or null if required files are missing
 */
export async function extractDocxStyles(zip: JSZip): Promise<ExtractedStyles | null> {
  const stylesFile = zip.file("word/styles.xml");
  if (!stylesFile) return null;

  const stylesXml = await stylesFile.async("string");
  const parser = new DOMParser();
  const stylesDoc = parser.parseFromString(stylesXml, "text/xml");

  // Extract default font from docDefaults
  const defaultFont = extractDefaultFont(stylesDoc);

  // Extract fonts from style definitions
  const fonts = extractFontsFromStyles(stylesDoc, defaultFont);

  // Page layout extraction available for future use via extractPageLayout()

  return {
    type: "document",
    numberFormats: [],
    fonts,
    fills: [],
    borders: [],
    cellStyles: [],
    themeColors: [],
  };
}

/**
 * Extracts the default font name from w:docDefaults.
 */
function extractDefaultFont(doc: Document): string {
  const docDefaults = doc.getElementsByTagNameNS(NS_W, "docDefaults")[0];
  if (!docDefaults) return "Calibri";

  const rPrDefault = docDefaults.getElementsByTagNameNS(NS_W, "rPrDefault")[0];
  if (!rPrDefault) return "Calibri";

  const rPr = rPrDefault.getElementsByTagNameNS(NS_W, "rPr")[0];
  if (!rPr) return "Calibri";

  const rFonts = rPr.getElementsByTagNameNS(NS_W, "rFonts")[0];
  return rFonts?.getAttribute("w:ascii") ?? "Calibri";
}

/**
 * Extracts font definitions from style elements.
 */
function extractFontsFromStyles(
  doc: Document,
  defaultFont: string,
): Array<{ name: string; size: number; bold: boolean; italic: boolean; color: string }> {
  const fonts: Array<{ name: string; size: number; bold: boolean; italic: boolean; color: string }> = [];

  // Add default font
  fonts.push({
    name: defaultFont,
    size: 11,
    bold: false,
    italic: false,
    color: "000000",
  });

  // Extract from named styles
  const styleElements = doc.getElementsByTagNameNS(NS_W, "style");
  for (let i = 0; i < styleElements.length; i++) {
    const style = styleElements[i];
    if (!style) continue;

    const rPr = style.getElementsByTagNameNS(NS_W, "rPr")[0];
    if (!rPr) continue;

    const rFonts = rPr.getElementsByTagNameNS(NS_W, "rFonts")[0];
    const sz = rPr.getElementsByTagNameNS(NS_W, "sz")[0];
    const bold = rPr.getElementsByTagNameNS(NS_W, "b")[0];
    const italic = rPr.getElementsByTagNameNS(NS_W, "i")[0];
    const color = rPr.getElementsByTagNameNS(NS_W, "color")[0];

    const fontName = rFonts?.getAttribute("w:ascii") ?? defaultFont;
    const fontSize = sz ? parseInt(sz.getAttribute("w:val") ?? "22", 10) / 2 : 11;

    fonts.push({
      name: fontName,
      size: fontSize,
      bold: bold !== undefined,
      italic: italic !== undefined,
      color: color?.getAttribute("w:val") ?? "000000",
    });
  }

  return fonts;
}

/**
 * Extracts page layout dimensions from word/document.xml.
 * Exported for use by post-processor-docx in Phase 3.
 */
export async function extractPageLayout(
  docFile: JSZip.JSZipObject,
): Promise<{ width: number; height: number }> {
  const content = await docFile.async("string");
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/xml");

  const sectPr = doc.getElementsByTagNameNS(NS_W, "sectPr")[0];
  if (!sectPr) return { width: 11906, height: 16838 };

  const pgSz = sectPr.getElementsByTagNameNS(NS_W, "pgSz")[0];
  if (!pgSz) return { width: 11906, height: 16838 };

  return {
    width: parseInt(pgSz.getAttribute("w:w") ?? "11906", 10),
    height: parseInt(pgSz.getAttribute("w:h") ?? "16838", 10),
  };
}
