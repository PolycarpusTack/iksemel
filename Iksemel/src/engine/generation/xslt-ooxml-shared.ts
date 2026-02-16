/**
 * Shared helpers for OOXML (Office Open XML) XSLT generators.
 *
 * Provides column letter conversion (A..Z, AA..AB..),
 * cell reference building, and SpreadsheetML namespace constants.
 */

// ─── Namespace Constants ────────────────────────────────────────────────

export const NS_SPREADSHEETML =
  "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

export const NS_RELATIONSHIPS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export const NS_WORDPROCESSINGML =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

export const NS_PRESENTATIONML =
  "http://schemas.openxmlformats.org/presentationml/2006/main";

export const NS_DRAWINGML =
  "http://schemas.openxmlformats.org/drawingml/2006/main";

export const NS_XFEB_FRAGMENT = "urn:xfeb:spreadsheet-fragment:v1";

export const NS_XFEB_DOCUMENT_FRAGMENT = "urn:xfeb:document-fragment:v1";

export const NS_XFEB_SLIDE_FRAGMENT = "urn:xfeb:slide-fragment:v1";

// ─── Column Letter Conversion ───────────────────────────────────────────

/**
 * Converts a 0-based column index to an Excel column letter (A, B, ..., Z, AA, AB, ...).
 *
 * @param index - 0-based column index
 * @returns Column letter string
 *
 * @example
 * ```ts
 * columnIndexToLetter(0)   // "A"
 * columnIndexToLetter(25)  // "Z"
 * columnIndexToLetter(26)  // "AA"
 * columnIndexToLetter(27)  // "AB"
 * ```
 */
export function columnIndexToLetter(index: number): string {
  let result = "";
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

/**
 * Builds a cell reference from a column index and row number.
 *
 * @param colIndex - 0-based column index
 * @param rowNumber - 1-based row number
 * @returns Cell reference string (e.g. "A1", "Z10", "AA1")
 */
export function cellRef(colIndex: number, rowNumber: number): string {
  return `${columnIndexToLetter(colIndex)}${String(rowNumber)}`;
}

// ─── SpreadsheetML Cell Type Mapping ────────────────────────────────────

/**
 * Maps column format hints to SpreadsheetML cell type attributes.
 * "s" = shared string, "n" = number, "d" = date (ISO 8601).
 */
export const SPREADSHEET_CELL_TYPES: Readonly<Record<string, string>> = {
  text: "s",
  auto: "s",
  number: "n",
  date: "d",
  datetime: "d",
};

/**
 * Maps column format hints to SpreadsheetML style indices
 * in the default scaffold's styles.xml.
 * 0 = default, 1 = header (bold + fill), 2 = data with border, 3 = date with border.
 */
export const DEFAULT_STYLE_INDICES: Readonly<Record<string, number>> = {
  text: 2,
  auto: 2,
  number: 2,
  date: 3,
  datetime: 3,
};
