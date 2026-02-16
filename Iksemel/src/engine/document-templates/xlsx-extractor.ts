/**
 * XLSX-specific style extractor.
 *
 * Parses xl/styles.xml via DOMParser to extract fonts, fills, borders,
 * number formats, cell styles, and theme colors from an uploaded XLSX file.
 */

import type JSZip from "jszip";
import type {
  ExtractedStyles,
  NumberFormatDef,
  FontDef,
  FillDef,
  BorderDef,
  CellStyleDef,
} from "@/types";

const NS_SPREADSHEETML = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

/**
 * Extracts styles from an XLSX ZIP's xl/styles.xml.
 *
 * @param zip - JSZip instance of the uploaded XLSX file
 * @returns Extracted spreadsheet styles, or null if styles.xml is missing
 */
export async function extractXlsxStyles(zip: JSZip): Promise<ExtractedStyles | null> {
  const stylesFile = zip.file("xl/styles.xml");
  if (!stylesFile) return null;

  const stylesXml = await stylesFile.async("string");
  const parser = new DOMParser();
  const doc = parser.parseFromString(stylesXml, "text/xml");

  const numberFormats = extractNumberFormats(doc);
  const fonts = extractFonts(doc);
  const fills = extractFills(doc);
  const borders = extractBorders(doc);
  const cellStyles = extractCellStyles(doc);
  const themeColors = await extractThemeColors(zip);

  return {
    type: "spreadsheet",
    numberFormats,
    fonts,
    fills,
    borders,
    cellStyles,
    themeColors,
  };
}

function extractNumberFormats(doc: Document): NumberFormatDef[] {
  const formats: NumberFormatDef[] = [];
  const elements = doc.getElementsByTagNameNS(NS_SPREADSHEETML, "numFmt");
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el) continue;
    const id = parseInt(el.getAttribute("numFmtId") ?? "0", 10);
    const formatCode = el.getAttribute("formatCode") ?? "";
    formats.push({ id, formatCode });
  }
  return formats;
}

function extractFonts(doc: Document): FontDef[] {
  const fonts: FontDef[] = [];
  const fontElements = doc.getElementsByTagNameNS(NS_SPREADSHEETML, "font");
  for (let i = 0; i < fontElements.length; i++) {
    const el = fontElements[i];
    if (!el) continue;

    const nameEl = el.getElementsByTagNameNS(NS_SPREADSHEETML, "name")[0];
    const szEl = el.getElementsByTagNameNS(NS_SPREADSHEETML, "sz")[0];
    const bEl = el.getElementsByTagNameNS(NS_SPREADSHEETML, "b")[0];
    const iEl = el.getElementsByTagNameNS(NS_SPREADSHEETML, "i")[0];
    const colorEl = el.getElementsByTagNameNS(NS_SPREADSHEETML, "color")[0];

    fonts.push({
      name: nameEl?.getAttribute("val") ?? "Calibri",
      size: parseFloat(szEl?.getAttribute("val") ?? "11"),
      bold: bEl !== undefined,
      italic: iEl !== undefined,
      color: colorEl?.getAttribute("rgb") ?? colorEl?.getAttribute("theme") ?? "000000",
    });
  }
  return fonts;
}

function extractFills(doc: Document): FillDef[] {
  const fills: FillDef[] = [];
  const fillElements = doc.getElementsByTagNameNS(NS_SPREADSHEETML, "fill");
  for (let i = 0; i < fillElements.length; i++) {
    const el = fillElements[i];
    if (!el) continue;

    const patternFill = el.getElementsByTagNameNS(NS_SPREADSHEETML, "patternFill")[0];
    const patternType = patternFill?.getAttribute("patternType") ?? "none";
    const fgColorEl = patternFill?.getElementsByTagNameNS(NS_SPREADSHEETML, "fgColor")[0];
    const bgColorEl = patternFill?.getElementsByTagNameNS(NS_SPREADSHEETML, "bgColor")[0];

    fills.push({
      patternType,
      fgColor: fgColorEl?.getAttribute("rgb") ?? "",
      bgColor: bgColorEl?.getAttribute("rgb") ?? "",
    });
  }
  return fills;
}

function extractBorders(doc: Document): BorderDef[] {
  const borders: BorderDef[] = [];
  const borderElements = doc.getElementsByTagNameNS(NS_SPREADSHEETML, "border");
  for (let i = 0; i < borderElements.length; i++) {
    const el = borderElements[i];
    if (!el) continue;

    // Extract the bottom border as representative
    const bottomEl = el.getElementsByTagNameNS(NS_SPREADSHEETML, "bottom")[0];
    const style = bottomEl?.getAttribute("style") ?? "";
    const colorEl = bottomEl?.getElementsByTagNameNS(NS_SPREADSHEETML, "color")[0];
    const color = colorEl?.getAttribute("indexed") ?? colorEl?.getAttribute("rgb") ?? "";

    borders.push({ style, color });
  }
  return borders;
}

function extractCellStyles(doc: Document): CellStyleDef[] {
  const styles: CellStyleDef[] = [];
  // Look at cellXfs (applied styles) rather than cellStyleXfs (named styles)
  const cellXfsEl = doc.getElementsByTagNameNS(NS_SPREADSHEETML, "cellXfs")[0];
  if (!cellXfsEl) return styles;

  const xfElements = cellXfsEl.getElementsByTagNameNS(NS_SPREADSHEETML, "xf");
  for (let i = 0; i < xfElements.length; i++) {
    const el = xfElements[i];
    if (!el) continue;

    styles.push({
      name: `Style ${String(i)}`,
      fontIndex: parseInt(el.getAttribute("fontId") ?? "0", 10),
      fillIndex: parseInt(el.getAttribute("fillId") ?? "0", 10),
      borderIndex: parseInt(el.getAttribute("borderId") ?? "0", 10),
      numberFormatId: parseInt(el.getAttribute("numFmtId") ?? "0", 10),
    });
  }
  return styles;
}

async function extractThemeColors(zip: JSZip): Promise<string[]> {
  const themeFile = zip.file("xl/theme/theme1.xml");
  if (!themeFile) return [];

  const themeXml = await themeFile.async("string");
  const parser = new DOMParser();
  const doc = parser.parseFromString(themeXml, "text/xml");

  const NS_DRAWINGML = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const colors: string[] = [];

  // Extract clrScheme colors
  const clrScheme = doc.getElementsByTagNameNS(NS_DRAWINGML, "clrScheme")[0];
  if (!clrScheme) return colors;

  for (let i = 0; i < clrScheme.children.length; i++) {
    const child = clrScheme.children[i];
    if (!child) continue;
    const srgb = child.getElementsByTagNameNS(NS_DRAWINGML, "srgbClr")[0];
    const sysClr = child.getElementsByTagNameNS(NS_DRAWINGML, "sysClr")[0];
    const val = srgb?.getAttribute("val") ?? sysClr?.getAttribute("lastClr") ?? "";
    if (val) colors.push(val);
  }

  return colors;
}
