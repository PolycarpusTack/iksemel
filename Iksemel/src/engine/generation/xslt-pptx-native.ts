/**
 * PPTX-native XSLT generator.
 *
 * Generates an XSLT stylesheet that produces a PresentationML XML fragment
 * wrapped in <xfeb:SlideFragment>. This fragment contains a DrawingML table
 * (<a:tbl>) suitable for insertion into a PPTX slide.
 */

import type { GeneratorInput, ColumnDefinition } from "@/types";
import { escXml } from "@/utils/xml";
import { registerGenerator } from "./xslt-registry";
import { validateAndReturn, buildSortBlock } from "./xslt-shared";
import { NS_XFEB_SLIDE_FRAGMENT, NS_DRAWINGML } from "./xslt-ooxml-shared";

/** 1 inch = 914400 EMU (English Metric Units). */
const EMU_PER_INCH = 914400;

/**
 * Generates an XSLT stylesheet targeting PresentationML fragment output.
 */
export function generatePptxNativeXslt(input: GeneratorInput): string {
  const { columns, rowSource, style, groupBy, sortBy, title } = input;

  const safeRowSource = validateAndReturn(rowSource || "//Slot");
  const safeTitle = escXml(title || "Export");

  const sortBlock = buildSortBlock(
    sortBy?.field ?? null,
    sortBy?.dir ?? "asc",
    groupBy,
    "                  ",
  );

  // Column widths in EMU (default: 1.5 inches each)
  const gridCols = columns
    .map((col) => {
      const widthEmu = Math.round((col.width / 96) * EMU_PER_INCH);
      return `              <a:gridCol w="${String(widthEmu)}"/>`;
    })
    .join("\n");

  const headerCells = columns
    .map((col) => buildHeaderCell(col, style.headerBg, style.headerFg))
    .join("\n");

  const dataCells = columns
    .map((col) => buildDataCell(col))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xfeb="${NS_XFEB_SLIDE_FRAGMENT}"
    xmlns:a="${NS_DRAWINGML}">
  <xsl:output method="xml" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <xfeb:SlideFragment xmlns:xfeb="${NS_XFEB_SLIDE_FRAGMENT}">

      <xfeb:Title>${safeTitle}</xfeb:Title>

      <a:tbl>
        <a:tblPr firstRow="1" bandRow="1">
          <a:tableStyleId>{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}</a:tableStyleId>
        </a:tblPr>
        <a:tblGrid>
${gridCols}
        </a:tblGrid>

        <!-- Header row -->
        <a:tr h="370840">
${headerCells}
        </a:tr>

        <!-- Data rows -->
        <xsl:for-each select="${safeRowSource}">
${sortBlock}
          <a:tr h="370840">
${dataCells}
          </a:tr>
        </xsl:for-each>
      </a:tbl>

    </xfeb:SlideFragment>
  </xsl:template>
</xsl:stylesheet>`;
}

function buildHeaderCell(col: ColumnDefinition, headerBg: string, headerFg: string): string {
  const bg = headerBg.replace("#", "");
  const fg = headerFg.replace("#", "");
  return `          <a:tc>
            <a:txBody>
              <a:bodyPr/>
              <a:p><a:r><a:rPr lang="en-US" b="1" dirty="0"><a:solidFill><a:srgbClr val="${escXml(fg)}"/></a:solidFill></a:rPr><a:t>${escXml(col.header)}</a:t></a:r></a:p>
            </a:txBody>
            <a:tcPr><a:solidFill><a:srgbClr val="${escXml(bg)}"/></a:solidFill></a:tcPr>
          </a:tc>`;
}

function buildDataCell(col: ColumnDefinition): string {
  const safeXpath = validateAndReturn(col.xpath);
  return `          <a:tc>
            <a:txBody>
              <a:bodyPr/>
              <a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t><xsl:value-of select="${safeXpath}" /></a:t></a:r></a:p>
            </a:txBody>
            <a:tcPr/>
          </a:tc>`;
}

// Auto-register
registerGenerator("pptx-native", generatePptxNativeXslt);
