/**
 * ODS post-processor.
 *
 * Merges an ODF table fragment into an ODS scaffold ZIP.
 */

import JSZip from "jszip";
import {
  registerPostProcessor,
  type PostProcessInput,
  type PostProcessResult,
} from "./post-processor-registry";
import { NS_XFEB_ODF_FRAGMENT } from "./xslt-odf-shared";

const ODS_MIME_TYPE = "application/vnd.oasis.opendocument.spreadsheet";

/**
 * Post-processes an XSLT ODF table fragment into a complete .ods file.
 */
export async function postProcessOds(
  input: PostProcessInput,
): Promise<PostProcessResult> {
  const { xsltOutput, template, title: _title, author: _author } = input;

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

  const fragmentEl = doc.getElementsByTagNameNS(NS_XFEB_ODF_FRAGMENT, "OdfFragment")[0];
  if (!fragmentEl) {
    throw new Error("Missing xfeb:OdfFragment in XSLT output");
  }

  // Extract table:table elements
  const serializer = new XMLSerializer();
  const NS_TABLE = "urn:oasis:names:tc:opendocument:xmlns:table:1.0";
  const tables = fragmentEl.getElementsByTagNameNS(NS_TABLE, "table");
  const tableXml: string[] = [];
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    if (t) tableXml.push(serializer.serializeToString(t));
  }

  // Build content.xml
  const contentXml = buildOdsContentXml(tableXml.join("\n"), _title);
  zip.file("content.xml", contentXml);

  // Ensure META-INF/manifest.xml exists
  if (!zip.file("META-INF/manifest.xml")) {
    zip.file("META-INF/manifest.xml", buildManifestXml("spreadsheet"));
  }

  // Set mimetype (must be first file, uncompressed in real ODF — we approximate)
  zip.file("mimetype", ODS_MIME_TYPE);

  const data = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { data, mimeType: ODS_MIME_TYPE, extension: ".ods" };
}

function buildOdsContentXml(tableXml: string, _title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
    xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
    xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
    xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
    xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
    xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
    office:version="1.3">
  <office:automatic-styles>
    <style:style style:name="co1" style:family="table-column">
      <style:table-column-properties fo:break-before="auto" style:column-width="2.5cm"/>
    </style:style>
    <style:style style:name="ro1" style:family="table-row">
      <style:table-row-properties style:row-height="0.5cm"/>
    </style:style>
    <style:style style:name="header" style:family="table-cell">
      <style:table-cell-properties fo:background-color="#1a365d"/>
      <style:text-properties fo:color="#ffffff" fo:font-weight="bold"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:spreadsheet>
${tableXml}
    </office:spreadsheet>
  </office:body>
</office:document-content>`;
}

function buildManifestXml(type: "spreadsheet" | "text"): string {
  const mimeType = type === "spreadsheet"
    ? "application/vnd.oasis.opendocument.spreadsheet"
    : "application/vnd.oasis.opendocument.text";
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:media-type="${mimeType}" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
</manifest:manifest>`;
}

registerPostProcessor("ods-native", postProcessOds);
