/**
 * Excel XSLT generator.
 *
 * Generates an XSLT stylesheet that produces Office-compatible HTML
 * (Excel Web Query format) with:
 * - Office XML namespaces and conditional comments for Excel features
 * - FreezePanes on the header row and optional AutoFilter
 * - mso-number-format directives for date, datetime, and number columns
 * - Alternating row styles via xsl:if on position()
 * - Group-break headers with xsl:sort BEFORE the group detection xsl:if
 *
 * All user-provided strings are escaped through escXml.
 * XPath expressions are validated through validateXPath.
 */

import type { GeneratorInput, ColumnDefinition } from "@/types";
import { escXml } from "@/utils/xml";
import { registerGenerator } from "./xslt-registry";
import { validateAndReturn, buildSortBlock } from "./xslt-shared";

/**
 * Maps column format hints to Excel mso-number-format strings.
 */
const MSO_FORMATS: Readonly<Record<string, string>> = {
  date: "yyyy\\-mm\\-dd",
  datetime: "yyyy\\-mm\\-dd hh\\:mm",
  number: "\\#\\,\\#\\#0",
};

/**
 * Generates an XSLT stylesheet targeting Excel HTML format.
 *
 * @param input - Generator input configuration
 * @returns Complete XSLT stylesheet string
 */
export function generateExcelXslt(input: GeneratorInput): string {
  const { columns, rowSource, style, groupBy, sortBy, title } = input;

  const safeRowSource = validateAndReturn(rowSource || "//Slot");
  const safeTitle = escXml(title || "Export");

  const sortBlock = buildSortBlock(sortBy?.field ?? null, sortBy?.dir ?? "asc", groupBy);
  const groupBlock = buildGroupBlock(groupBy, columns.length, style.groupBg, style.headerBg);

  const headerCells = columns
    .map((col) => {
      const w = col.width || 120;
      return (
        `<th style="background:${escXml(style.headerBg)};` +
        `color:${escXml(style.headerFg)};` +
        `padding:8px 6px;text-align:left;font-size:10pt;font-weight:bold;` +
        `border-bottom:2px solid ${escXml(style.headerBg)};` +
        `width:${String(w)}px">` +
        `${escXml(col.header)}</th>`
      );
    })
    .join("\n              ");

  const dataCells = columns
    .map((col) => buildDataCell(col))
    .join("\n                ");

  const altRowExpr =
    `<xsl:attribute name="style">` +
    `<xsl:if test="position() mod 2 = 0">` +
    `background:${escXml(style.altRowBg || "#f9f9f9")};` +
    `</xsl:if></xsl:attribute>`;

  const titleBlock = style.showTitle
    ? `\n        <h2 style="font-family:${escXml(style.fontFamily || "Calibri")};color:${escXml(style.headerBg)};margin-bottom:12px;">${safeTitle}</h2>`
    : "";

  const footerBlock = style.showFooter
    ? `\n        <p style="font-size:8pt;color:#888;margin-top:16px;">Generated: <xsl:value-of select="//ExportTimestamp" /> | Source: <xsl:value-of select="//SourceSystem" /></p>`
    : "";

  const autoFilterTag = style.autoFilter
    ? "<x:AutoFilter/>"
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <xsl:comment>[if gte mso 9]&gt;&lt;xml&gt;&lt;x:ExcelWorkbook&gt;&lt;x:ExcelWorksheets&gt;&lt;x:ExcelWorksheet&gt;
          &lt;x:Name&gt;${safeTitle}&lt;/x:Name&gt;
          &lt;x:WorksheetOptions&gt;&lt;x:FreezePanes/&gt;&lt;x:FrozenNoSplit/&gt;&lt;x:SplitHorizontal&gt;1&lt;/x:SplitHorizontal&gt;&lt;x:TopRowBottomPane&gt;1&lt;/x:TopRowBottomPane&gt;&lt;x:ActivePane&gt;2&lt;/x:ActivePane&gt;${autoFilterTag}&lt;/x:WorksheetOptions&gt;
        &lt;/x:ExcelWorksheet&gt;&lt;/x:ExcelWorksheets&gt;&lt;/x:ExcelWorkbook&gt;&lt;/xml&gt;&lt;![endif]</xsl:comment>
        <style>
          body { font-family: ${escXml(style.fontFamily || "Calibri, sans-serif")}; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>${titleBlock}
        <table>
          <thead>
            <tr>
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="${safeRowSource}">
${sortBlock}${groupBlock}
              <tr>
                ${altRowExpr}
                ${dataCells}
              </tr>
            </xsl:for-each>
          </tbody>
        </table>${footerBlock}
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;
}

/**
 * Builds the group-break detection xsl:if block.
 */
function buildGroupBlock(
  groupBy: string | null,
  colCount: number,
  groupBg: string,
  headerBg: string,
): string {
  if (!groupBy) return "";

  const safeGroupBy = validateAndReturn(groupBy);
  const safeBg = escXml(groupBg || "#e8e8e8");
  const safeBorder = escXml(headerBg);

  return `
              <xsl:if test="not(${safeGroupBy} = preceding-sibling::*/${safeGroupBy}) or position()=1">
                <tr>
                  <td colspan="${String(colCount)}" style="background:${safeBg};font-weight:bold;padding:8px 6px;font-size:11pt;border-bottom:2px solid ${safeBorder};">
                    <xsl:value-of select="${safeGroupBy}" />
                  </td>
                </tr>
              </xsl:if>`;
}

/**
 * Builds a single data cell with optional mso-number-format.
 * Uses xsl:text with disable-output-escaping for XML entities
 * rather than raw string interpolation in the XSLT output.
 */
function buildDataCell(col: ColumnDefinition): string {
  const safeXpath = validateAndReturn(col.xpath);
  const alignStyle = col.align ? `text-align:${escXml(col.align)};` : "";
  const msoFormat = MSO_FORMATS[col.format];
  const msoStyle = msoFormat ? `mso-number-format:&apos;${msoFormat}&apos;;` : "";

  return (
    `<td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;font-size:10pt;${alignStyle}${msoStyle}">` +
    `<xsl:value-of select="${safeXpath}" /></td>`
  );
}

// Auto-register this generator
registerGenerator("xlsx", generateExcelXslt);
