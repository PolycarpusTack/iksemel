/**
 * XLSX-native XSLT generator.
 *
 * Generates an XSLT stylesheet that produces a SpreadsheetML XML fragment
 * wrapped in <xfeb:SheetFragment>. This fragment is consumed by the
 * XLSX post-processor (post-processor-xlsx.ts) which merges it into
 * an OOXML ZIP scaffold to create a native .xlsx file.
 *
 * The XSLT output contains:
 * - <xfeb:Rows> — row data with SpreadsheetML <row> and <c> elements
 * - <xfeb:SharedStrings> — shared string table entries
 * - <xfeb:Metadata> — title, column count, row count
 *
 * Follows the exact pattern of xslt-excel.ts (imports, auto-registration,
 * helper functions). Reuses validateAndReturn, buildSortBlock from xslt-shared.ts.
 */

import type { GeneratorInput, ColumnDefinition } from "@/types";
import { escXml } from "@/utils/xml";
import { registerGenerator } from "./xslt-registry";
import { validateAndReturn, buildSortBlock } from "./xslt-shared";
import {
  columnIndexToLetter,
  NS_XFEB_FRAGMENT,
  SPREADSHEET_CELL_TYPES,
  DEFAULT_STYLE_INDICES,
} from "./xslt-ooxml-shared";

/**
 * Generates an XSLT stylesheet targeting SpreadsheetML fragment output.
 *
 * @param input - Generator input configuration
 * @returns Complete XSLT stylesheet string that outputs an xfeb:SheetFragment
 */
export function generateXlsxNativeXslt(input: GeneratorInput): string {
  const { columns, rowSource, style, groupBy, sortBy, title } = input;

  const safeRowSource = validateAndReturn(rowSource || "//Slot");
  const safeTitle = escXml(title || "Export");

  const sortBlock = buildSortBlock(
    sortBy?.field ?? null,
    sortBy?.dir ?? "asc",
    groupBy,
    "              ",
  );

  // Build shared string entries for headers (static, known at generation time)
  const sharedStringEntries = columns
    .map((col) => `        <si><t>${escXml(col.header)}</t></si>`)
    .join("\n");

  // Build header row cells — all headers are shared-string references
  const headerCells = columns
    .map((_col, i) => {
      const ref = `${columnIndexToLetter(i)}1`;
      return `          <c r="${ref}" t="s" s="1"><v>${String(i)}</v></c>`;
    })
    .join("\n");

  // Build data row cells
  const dataCells = columns
    .map((col, i) => buildDataCell(col, i))
    .join("\n");

  // Build group-break row if groupBy is configured
  const groupBlock = buildGroupBlock(groupBy, columns.length);

  const colCount = String(columns.length);

  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xfeb="${NS_XFEB_FRAGMENT}">
  <xsl:output method="xml" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <xfeb:SheetFragment xmlns:xfeb="${NS_XFEB_FRAGMENT}">

      <xfeb:Rows>
        <!-- Header row -->
        <row r="1">
${headerCells}
        </row>
        <!-- Data rows -->
        <xsl:for-each select="${safeRowSource}">
${sortBlock}${groupBlock}
          <row>
            <xsl:attribute name="r"><xsl:value-of select="position() + 1" /></xsl:attribute>
${dataCells}
          </row>
        </xsl:for-each>
      </xfeb:Rows>

      <xfeb:SharedStrings>
${sharedStringEntries}
      </xfeb:SharedStrings>

      <xfeb:Metadata>
        <xfeb:Title>${safeTitle}</xfeb:Title>
        <xfeb:ColumnCount>${colCount}</xfeb:ColumnCount>
        <xfeb:Author>${escXml(style.name || "XFEB")}</xfeb:Author>
        <xfeb:HeaderStyleIndex>1</xfeb:HeaderStyleIndex>
      </xfeb:Metadata>

    </xfeb:SheetFragment>
  </xsl:template>
</xsl:stylesheet>`;
}

/**
 * Builds a single SpreadsheetML data cell element with XSLT value-of.
 *
 * For text/auto columns, values are emitted inline (t="inlineStr").
 * For number/date columns, values are emitted as typed values.
 */
function buildDataCell(col: ColumnDefinition, colIndex: number): string {
  const safeXpath = validateAndReturn(col.xpath);
  const colLetter = columnIndexToLetter(colIndex);
  const cellType = SPREADSHEET_CELL_TYPES[col.format] || "s";
  const styleIndex = DEFAULT_STYLE_INDICES[col.format] || 2;

  if (cellType === "s") {
    // Inline string: avoids needing to build a dynamic shared-string table at XSLT time
    return (
      `          <c r="${colLetter}{{position() + 1}}" t="inlineStr" s="${String(styleIndex)}">` +
      `<is><t><xsl:value-of select="${safeXpath}" /></t></is></c>`
    );
  }

  // Numeric or date value
  return (
    `          <c r="${colLetter}{{position() + 1}}" t="${cellType}" s="${String(styleIndex)}">` +
    `<v><xsl:value-of select="${safeXpath}" /></v></c>`
  );
}

/**
 * Builds a group-break row for SpreadsheetML output.
 * Emits a merged-cell-style row with the group value spanning all columns.
 */
function buildGroupBlock(groupBy: string | null, _colCount: number): string {
  if (!groupBy) return "";

  const safeGroupBy = validateAndReturn(groupBy);

  return `
          <xsl:if test="not(${safeGroupBy} = preceding-sibling::*/${safeGroupBy}) or position()=1">
            <row>
              <xsl:attribute name="r"><xsl:value-of select="position() + 1" /></xsl:attribute>
              <c r="A{{position() + 1}}" t="inlineStr" s="1">
                <is><t><xsl:value-of select="${safeGroupBy}" /></t></is>
              </c>
            </row>
          </xsl:if>`;
}

// Auto-register this generator
registerGenerator("xlsx-native", generateXlsxNativeXslt);
