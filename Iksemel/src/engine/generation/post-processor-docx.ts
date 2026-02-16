/**
 * DOCX post-processor.
 *
 * Merges a WordprocessingML fragment into a DOCX scaffold ZIP.
 */

import JSZip from "jszip";
import {
  registerPostProcessor,
  type PostProcessInput,
  type PostProcessResult,
} from "./post-processor-registry";
import { NS_XFEB_DOCUMENT_FRAGMENT } from "./xslt-ooxml-shared";

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Post-processes an XSLT WordprocessingML fragment into a complete .docx file.
 */
export async function postProcessDocx(
  input: PostProcessInput,
): Promise<PostProcessResult> {
  const { xsltOutput, template, title, author } = input;

  const zip = new JSZip();
  for (const entry of template.scaffoldEntries) {
    zip.file(entry.path, entry.content);
  }

  // Parse the XSLT fragment
  const parser = new DOMParser();
  const doc = parser.parseFromString(xsltOutput, "text/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`Failed to parse XSLT output: ${parseError.textContent}`);
  }

  // Extract the w:tbl element
  const fragmentEl = doc.getElementsByTagNameNS(NS_XFEB_DOCUMENT_FRAGMENT, "DocumentFragment")[0];
  if (!fragmentEl) {
    throw new Error("Missing xfeb:DocumentFragment in XSLT output");
  }

  const serializer = new XMLSerializer();
  const tblElements: string[] = [];
  const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const tables = fragmentEl.getElementsByTagNameNS(NS_W, "tbl");
  for (let i = 0; i < tables.length; i++) {
    const tbl = tables[i];
    if (tbl) tblElements.push(serializer.serializeToString(tbl));
  }

  // Build title paragraph
  const titleParagraph = title
    ? `<w:p xmlns:w="${NS_W}"><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(title)}</w:t></w:r></w:p>`
    : "";

  // Merge into document.xml — insert before </w:body>
  const documentXml = buildDocumentXml(titleParagraph, tblElements.join("\n"));
  zip.file("word/document.xml", documentXml);

  // Update core properties
  zip.file("docProps/core.xml", buildCoreProperties(title, author));

  const data = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { data, mimeType: DOCX_MIME_TYPE, extension: ".docx" };
}

function buildDocumentXml(titleParagraph: string, tableXml: string): string {
  const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:w10="urn:schemas-microsoft-com:office:word"
            xmlns:w="${NS_W}"
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
            mc:Ignorable="w14 wp14">
  <w:body>
${titleParagraph}
${tableXml}
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function buildCoreProperties(title: string, author: string): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>${escapeXml(author)}</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
</cp:coreProperties>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

registerPostProcessor("docx-native", postProcessDocx);
