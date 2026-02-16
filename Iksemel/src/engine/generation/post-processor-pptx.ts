/**
 * PPTX post-processor.
 *
 * Merges a PresentationML fragment into a PPTX scaffold ZIP.
 */

import JSZip from "jszip";
import {
  registerPostProcessor,
  type PostProcessInput,
  type PostProcessResult,
} from "./post-processor-registry";
import { NS_XFEB_SLIDE_FRAGMENT, NS_DRAWINGML } from "./xslt-ooxml-shared";

const PPTX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// Default PPTX scaffold for when no template is provided
const DEFAULT_PPTX_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

/**
 * Post-processes an XSLT PresentationML fragment into a complete .pptx file.
 */
export async function postProcessPptx(
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

  // Extract the a:tbl element
  const fragmentEl = doc.getElementsByTagNameNS(NS_XFEB_SLIDE_FRAGMENT, "SlideFragment")[0];
  if (!fragmentEl) {
    throw new Error("Missing xfeb:SlideFragment in XSLT output");
  }

  const serializer = new XMLSerializer();
  const tblEl = fragmentEl.getElementsByTagNameNS(NS_DRAWINGML, "tbl")[0];
  const tableXml = tblEl ? serializer.serializeToString(tblEl) : "";

  // Build slide with graphicFrame wrapping the table
  const slideXml = buildSlideXml(title, tableXml);
  zip.file("ppt/slides/slide1.xml", slideXml);

  // Core properties
  zip.file("docProps/core.xml", buildCoreProperties(title, author));

  // Ensure content types
  if (!zip.file("[Content_Types].xml")) {
    zip.file("[Content_Types].xml", DEFAULT_PPTX_CONTENT_TYPES);
  }

  const data = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { data, mimeType: PPTX_MIME_TYPE, extension: ".pptx" };
}

function buildSlideXml(title: string, tableXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <!-- Title -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr/>
        <p:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escapeXml(title)}</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <!-- Data table -->
      <p:graphicFrame>
        <p:nvGraphicFramePr><p:cNvPr id="3" name="Table"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>
        <p:xfrm><a:off x="457200" y="1600200"/><a:ext cx="8229600" cy="4525963"/></p:xfrm>
        <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
${tableXml}
        </a:graphicData></a:graphic>
      </p:graphicFrame>
    </p:spTree>
  </p:cSld>
</p:sld>`;
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

registerPostProcessor("pptx-native", postProcessPptx);
