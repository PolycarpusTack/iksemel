/**
 * ODT-native XSLT generator.
 *
 * Generates an XSLT stylesheet that produces an ODF text:table fragment
 * wrapped in <xfeb:OdfFragment>. This fragment is consumed by the
 * ODT post-processor which merges it into an ODT content.xml.
 */

import type { GeneratorInput, ColumnDefinition } from "@/types";
import { escXml } from "@/utils/xml";
import { registerGenerator } from "./xslt-registry";
import { validateAndReturn, buildSortBlock } from "./xslt-shared";
import { NS_TABLE, NS_TEXT, NS_XFEB_ODF_FRAGMENT } from "./xslt-odf-shared";

/**
 * Generates an XSLT stylesheet targeting ODF Text fragment output.
 */
export function generateOdtNativeXslt(input: GeneratorInput): string {
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
    .map(() => `          <table:table-column/>`)
    .join("\n");

  const headerCells = columns
    .map((col) =>
      `              <table:table-cell table:style-name="header"><text:p text:style-name="Table_20_Heading">${escXml(col.header)}</text:p></table:table-cell>`,
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

      <text:p text:style-name="Heading_20_1">${safeTitle}</text:p>

      <table:table table:name="${safeTitle}" table:style-name="TableGrid">
${colDefs}
        <!-- Header row -->
        <table:table-row>
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
  return `            <table:table-cell><text:p text:style-name="Table_20_Contents"><xsl:value-of select="${safeXpath}" /></text:p></table:table-cell>`;
}

function buildGroupBlock(groupBy: string | null, colCount: number): string {
  if (!groupBy) return "";

  const safeGroupBy = validateAndReturn(groupBy);

  return `
          <xsl:if test="not(${safeGroupBy} = preceding-sibling::*/${safeGroupBy}) or position()=1">
            <table:table-row>
              <table:table-cell table:number-columns-spanned="${String(colCount)}" table:style-name="group">
                <text:p text:style-name="Table_20_Heading"><xsl:value-of select="${safeGroupBy}" /></text:p>
              </table:table-cell>
            </table:table-row>
          </xsl:if>`;
}

// Auto-register
registerGenerator("odt-native", generateOdtNativeXslt);
