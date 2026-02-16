/**
 * ODS-native XSLT generator.
 *
 * Generates an XSLT stylesheet that produces an ODF <table:table> fragment
 * wrapped in <xfeb:OdfFragment>. This fragment is consumed by the
 * ODS post-processor which merges it into an ODS content.xml.
 */

import type { GeneratorInput, ColumnDefinition } from "@/types";
import { escXml } from "@/utils/xml";
import { registerGenerator } from "./xslt-registry";
import { validateAndReturn, buildSortBlock } from "./xslt-shared";
import { NS_TABLE, NS_TEXT, NS_XFEB_ODF_FRAGMENT } from "./xslt-odf-shared";

/**
 * Generates an XSLT stylesheet targeting ODF Spreadsheet fragment output.
 */
export function generateOdsNativeXslt(input: GeneratorInput): string {
  const { columns, rowSource, style: _style, groupBy, sortBy, title } = input;

  const safeRowSource = validateAndReturn(rowSource || "//Slot");
  const safeTitle = escXml(title || "Export");

  const sortBlock = buildSortBlock(
    sortBy?.field ?? null,
    sortBy?.dir ?? "asc",
    groupBy,
    "              ",
  );

  const colDefs = columns
    .map(() => `          <table:table-column table:style-name="co1"/>`)
    .join("\n");

  const headerCells = columns
    .map((col) =>
      `              <table:table-cell table:style-name="header" office:value-type="string"><text:p>${escXml(col.header)}</text:p></table:table-cell>`,
    )
    .join("\n");

  const dataCells = columns
    .map((col) => buildDataCell(col))
    .join("\n");

  const groupBlock = buildGroupBlock(groupBy, columns.length);

  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xfeb="${NS_XFEB_ODF_FRAGMENT}"
    xmlns:table="${NS_TABLE}"
    xmlns:text="${NS_TEXT}"
    xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0">
  <xsl:output method="xml" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <xfeb:OdfFragment xmlns:xfeb="${NS_XFEB_ODF_FRAGMENT}">

      <xfeb:Title>${safeTitle}</xfeb:Title>

      <table:table table:name="${safeTitle}">
${colDefs}
        <!-- Header row -->
        <table:table-row table:style-name="ro1">
${headerCells}
        </table:table-row>
        <!-- Data rows -->
        <xsl:for-each select="${safeRowSource}">
${sortBlock}${groupBlock}
          <table:table-row>
${dataCells}
          </table:table-row>
        </xsl:for-each>
      </table:table>

    </xfeb:OdfFragment>
  </xsl:template>
</xsl:stylesheet>`;
}

function buildDataCell(col: ColumnDefinition): string {
  const safeXpath = validateAndReturn(col.xpath);
  const valueType = col.format === "number" ? "float" : "string";

  return `            <table:table-cell office:value-type="${valueType}"><text:p><xsl:value-of select="${safeXpath}" /></text:p></table:table-cell>`;
}

function buildGroupBlock(groupBy: string | null, colCount: number): string {
  if (!groupBy) return "";

  const safeGroupBy = validateAndReturn(groupBy);

  return `
          <xsl:if test="not(${safeGroupBy} = preceding-sibling::*/${safeGroupBy}) or position()=1">
            <table:table-row table:style-name="ro-group">
              <table:table-cell table:number-columns-spanned="${String(colCount)}" table:style-name="group" office:value-type="string">
                <text:p><xsl:value-of select="${safeGroupBy}" /></text:p>
              </table:table-cell>
            </table:table-row>
          </xsl:if>`;
}

// Auto-register
registerGenerator("ods-native", generateOdsNativeXslt);
