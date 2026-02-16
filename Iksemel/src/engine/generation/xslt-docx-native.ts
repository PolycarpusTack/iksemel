/**
 * DOCX-native XSLT generator.
 *
 * Generates an XSLT stylesheet that produces a WordprocessingML XML fragment
 * wrapped in <xfeb:DocumentFragment>. This fragment is consumed by the
 * DOCX post-processor which merges it into a DOCX scaffold.
 *
 * The XSLT output contains a <w:tbl> element with header and data rows.
 */

import type { GeneratorInput, ColumnDefinition } from "@/types";
import { escXml } from "@/utils/xml";
import { registerGenerator } from "./xslt-registry";
import { validateAndReturn, buildSortBlock } from "./xslt-shared";
import { NS_XFEB_DOCUMENT_FRAGMENT } from "./xslt-ooxml-shared";

const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * Generates an XSLT stylesheet targeting WordprocessingML fragment output.
 */
export function generateDocxNativeXslt(input: GeneratorInput): string {
  const { columns, rowSource, style, groupBy, sortBy, title } = input;

  const safeRowSource = validateAndReturn(rowSource || "//Slot");
  const safeTitle = escXml(title || "Export");

  const sortBlock = buildSortBlock(
    sortBy?.field ?? null,
    sortBy?.dir ?? "asc",
    groupBy,
    "              ",
  );

  const headerCells = columns
    .map((col) =>
      `              <w:tc>
                <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${escXml(style.headerBg.replace("#", ""))}"/></w:tcPr>
                <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${escXml(style.headerFg.replace("#", ""))}"/></w:rPr><w:t>${escXml(col.header)}</w:t></w:r></w:p>
              </w:tc>`,
    )
    .join("\n");

  const dataCells = columns
    .map((col) => buildDataCell(col))
    .join("\n");

  const groupBlock = buildGroupBlock(groupBy, columns.length);

  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xfeb="${NS_XFEB_DOCUMENT_FRAGMENT}"
    xmlns:w="${NS_W}">
  <xsl:output method="xml" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <xfeb:DocumentFragment xmlns:xfeb="${NS_XFEB_DOCUMENT_FRAGMENT}">

      <xfeb:Title>${safeTitle}</xfeb:Title>

      <w:tbl>
        <w:tblPr>
          <w:tblStyle w:val="TableGrid"/>
          <w:tblW w:w="0" w:type="auto"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
          </w:tblBorders>
        </w:tblPr>

        <!-- Header row -->
        <w:tr>
${headerCells}
        </w:tr>

        <!-- Data rows -->
        <xsl:for-each select="${safeRowSource}">
${sortBlock}${groupBlock}
          <w:tr>
${dataCells}
          </w:tr>
        </xsl:for-each>
      </w:tbl>

    </xfeb:DocumentFragment>
  </xsl:template>
</xsl:stylesheet>`;
}

function buildDataCell(col: ColumnDefinition): string {
  const safeXpath = validateAndReturn(col.xpath);
  return `            <w:tc>
              <w:p><w:pPr><w:jc w:val="${escXml(col.align)}"/></w:pPr><w:r><w:t><xsl:value-of select="${safeXpath}" /></w:t></w:r></w:p>
            </w:tc>`;
}

function buildGroupBlock(groupBy: string | null, colCount: number): string {
  if (!groupBy) return "";

  const safeGroupBy = validateAndReturn(groupBy);

  return `
          <xsl:if test="not(${safeGroupBy} = preceding-sibling::*/${safeGroupBy}) or position()=1">
            <w:tr>
              <w:tc>
                <w:tcPr><w:gridSpan w:val="${String(colCount)}"/><w:shd w:val="clear" w:color="auto" w:fill="E8E8E8"/></w:tcPr>
                <w:p><w:r><w:rPr><w:b/></w:rPr><w:t><xsl:value-of select="${safeGroupBy}" /></w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </xsl:if>`;
}

// Auto-register
registerGenerator("docx-native", generateDocxNativeXslt);
