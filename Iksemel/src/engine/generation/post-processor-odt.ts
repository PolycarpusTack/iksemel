/**
 * ODT post-processor.
 *
 * Merges an ODF text fragment into an ODT scaffold ZIP.
 */

import JSZip from "jszip";
import {
  registerPostProcessor,
  type PostProcessInput,
  type PostProcessResult,
} from "./post-processor-registry";
import { NS_XFEB_ODF_FRAGMENT } from "./xslt-odf-shared";

const ODT_MIME_TYPE = "application/vnd.oasis.opendocument.text";

/**
 * Post-processes an XSLT ODF text fragment into a complete .odt file.
 */
export async function postProcessOdt(
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

  // Extract all child elements (paragraphs, tables, etc.)
  const serializer = new XMLSerializer();
  let bodyContent = "";
  for (let i = 0; i < fragmentEl.childNodes.length; i++) {
    const node = fragmentEl.childNodes[i];
    if (node && node.nodeType === 1) { // Element node
      const el = node as Element;
      // Skip xfeb namespace elements
      if (el.namespaceURI !== NS_XFEB_ODF_FRAGMENT) {
        bodyContent += serializer.serializeToString(el) + "\n";
      }
    }
  }

  // Build content.xml
  const contentXml = buildOdtContentXml(bodyContent);
  zip.file("content.xml", contentXml);

  // Ensure META-INF/manifest.xml
  if (!zip.file("META-INF/manifest.xml")) {
    zip.file("META-INF/manifest.xml", buildManifestXml());
  }

  zip.file("mimetype", ODT_MIME_TYPE);

  const data = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { data, mimeType: ODT_MIME_TYPE, extension: ".odt" };
}

function buildOdtContentXml(bodyContent: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
    xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
    xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
    xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
    xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
    xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
    office:version="1.3">
  <office:automatic-styles>
    <style:style style:name="TableGrid" style:family="table">
      <style:table-properties style:width="17cm" table:align="margins"/>
    </style:style>
    <style:style style:name="header" style:family="table-cell">
      <style:table-cell-properties fo:background-color="#1a365d" fo:padding="0.1cm"/>
      <style:text-properties fo:color="#ffffff" fo:font-weight="bold"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
${bodyContent}
    </office:text>
  </office:body>
</office:document-content>`;
}

function buildManifestXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
</manifest:manifest>`;
}

registerPostProcessor("odt-native", postProcessOdt);
