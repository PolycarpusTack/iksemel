/**
 * XLSX post-processor.
 *
 * Uses JSZip to merge an XSLT-generated SpreadsheetML fragment
 * into an OOXML scaffold ZIP, producing a native .xlsx file.
 *
 * Stage 2 of the two-stage pipeline:
 *   XSLT output (XML fragment) + Template Scaffold → .xlsx ZIP
 */

import JSZip from "jszip";
import {
  registerPostProcessor,
  type PostProcessInput,
  type PostProcessResult,
} from "./post-processor-registry";
import { NS_XFEB_FRAGMENT } from "./xslt-ooxml-shared";

/**
 * MIME type for XLSX files.
 */
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Post-processes an XSLT SpreadsheetML fragment into a complete .xlsx file.
 *
 * Steps:
 * 1. Load scaffold entries into a JSZip instance
 * 2. Parse the XSLT output fragment (DOMParser)
 * 3. Extract <xfeb:Rows> → merge into xl/worksheets/sheet1.xml
 * 4. Extract <xfeb:SharedStrings> → merge into xl/sharedStrings.xml
 * 5. Update docProps/core.xml with title/author
 * 6. Generate ZIP binary
 */
export async function postProcessXlsx(
  input: PostProcessInput,
): Promise<PostProcessResult> {
  const { xsltOutput, template, title, author } = input;

  // 1. Build ZIP from scaffold
  const zip = new JSZip();
  for (const entry of template.scaffoldEntries) {
    zip.file(entry.path, entry.content);
  }

  // 2. Parse the XSLT fragment
  const parser = new DOMParser();
  const doc = parser.parseFromString(xsltOutput, "text/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`Failed to parse XSLT output: ${parseError.textContent}`);
  }

  // 3. Extract rows and build sheetData
  const rowsEl = doc.getElementsByTagNameNS(NS_XFEB_FRAGMENT, "Rows")[0];
  const sharedStringsEl = doc.getElementsByTagNameNS(NS_XFEB_FRAGMENT, "SharedStrings")[0];
  const sheetDataXml = rowsEl ? extractInnerXml(rowsEl) : "";
  const sharedStringsXml = sharedStringsEl ? extractInnerXml(sharedStringsEl) : "";

  // Count shared strings
  const sharedStringCount = sharedStringsEl
    ? sharedStringsEl.getElementsByTagName("si").length
    : 0;

  // 4. Build final sheet1.xml
  const sheetXml = buildSheetXml(sheetDataXml);
  zip.file("xl/worksheets/sheet1.xml", sheetXml);

  // 5. Build shared strings
  const sstXml = buildSharedStringsXml(sharedStringsXml, sharedStringCount);
  zip.file("xl/sharedStrings.xml", sstXml);

  // 6. Update core properties
  const coreXml = buildCorePropertiesXml(title, author);
  zip.file("docProps/core.xml", coreXml);

  // 7. Generate ZIP
  const data = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    data,
    mimeType: XLSX_MIME_TYPE,
    extension: ".xlsx",
  };
}

/**
 * Extracts the inner XML of an element as a string.
 */
function extractInnerXml(element: Element): string {
  const serializer = new XMLSerializer();
  let result = "";
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    if (node) {
      result += serializer.serializeToString(node);
    }
  }
  return result;
}

/**
 * Builds the complete xl/worksheets/sheet1.xml content.
 */
function buildSheetXml(sheetDataXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetData>
${sheetDataXml}
  </sheetData>
</worksheet>`;
}

/**
 * Builds the complete xl/sharedStrings.xml content.
 */
function buildSharedStringsXml(innerXml: string, count: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${String(count)}" uniqueCount="${String(count)}">
${innerXml}
</sst>`;
}

/**
 * Builds the docProps/core.xml content with title and author.
 */
function buildCorePropertiesXml(title: string, author: string): string {
  const now = new Date().toISOString();
  const safeTitle = escapeXmlContent(title);
  const safeAuthor = escapeXmlContent(author);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${safeTitle}</dc:title>
  <dc:creator>${safeAuthor}</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
</cp:coreProperties>`;
}

/**
 * Minimal XML content escaping (for runtime values, not XSLT generation).
 */
function escapeXmlContent(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Auto-register this post-processor
registerPostProcessor("xlsx-native", postProcessXlsx);
