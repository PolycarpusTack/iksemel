/**
 * Word XSLT generator.
 *
 * Generates an XSLT stylesheet that produces Office-compatible HTML
 * (Word Web Query format) with:
 * - @page CSS rules for orientation and margins
 * - page-break-inside: avoid on table rows
 * - Metadata header with report title and date range
 * - Alternating row styles and group-break headers
 * - xsl:sort BEFORE group-break detection xsl:if
 *
 * All user-provided strings are escaped through escXml.
 * XPath expressions are validated through validateXPath.
 */

import type { GeneratorInput, ColumnDefinition } from "@/types";
import { escXml } from "@/utils/xml";
import { registerGenerator } from "./xslt-registry";
import { validateAndReturn, buildSortBlock } from "./xslt-shared";

/**
 * Generates an XSLT stylesheet targeting Word HTML format.
 *
 * @param input - Generator input configuration
 * @returns Complete XSLT stylesheet string
 */
export function generateWordXslt(input: GeneratorInput): string {
  const { columns, rowSource, style, groupBy, sortBy, title } = input;

  const safeRowSource = validateAndReturn(rowSource || "//Slot");
  const safeTitle = escXml(title || "Schedule Export");
  const safeOrientation = style.orientation === "landscape" ? "landscape" : "portrait";
  const safeMargins = escXml(style.margins || "1in");
  const safeFontFamily = escXml(style.fontFamily || "Calibri, serif");
  const safeFontSize = escXml(style.fontSize || "11");
  const safeHeaderBg = escXml(style.headerBg);
  const safeHeaderFg = escXml(style.headerFg);
  const safeAltRowBg = escXml(style.altRowBg || "#f9f9f9");

  const sortBlock = buildSortBlock(sortBy?.field ?? null, sortBy?.dir ?? "asc", groupBy);
  const groupBlock = buildGroupBlock(groupBy, columns.length, style.headerBg);

  const headerCells = columns
    .map((col) => `<th>${escXml(col.header)}</th>`)
    .join("");

  const dataCells = columns
    .map((col) => buildDataCell(col))
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <xsl:comment>[if gte mso 9]&gt;&lt;xml&gt;&lt;w:WordDocument&gt;&lt;w:View&gt;Print&lt;/w:View&gt;&lt;w:Zoom&gt;100&lt;/w:Zoom&gt;&lt;/w:WordDocument&gt;&lt;/xml&gt;&lt;![endif]</xsl:comment>
        <style>
          @page {
            size: ${safeOrientation};
            margin: ${safeMargins};
          }
          body {
            font-family: ${safeFontFamily};
            font-size: ${safeFontSize}pt;
            color: #333;
            line-height: 1.5;
          }
          h1 {
            color: ${safeHeaderBg};
            font-size: 18pt;
            border-bottom: 3px solid ${safeHeaderBg};
            padding-bottom: 8px;
            margin-bottom: 4px;
          }
          .subtitle {
            color: #666;
            font-size: 10pt;
            margin-bottom: 24px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 16px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
          th {
            background: ${safeHeaderBg};
            color: ${safeHeaderFg};
            padding: 8px 10px;
            text-align: left;
            font-weight: bold;
            font-size: 10pt;
          }
          td {
            padding: 6px 10px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 10pt;
            vertical-align: top;
          }
          tr:nth-child(even) td {
            background: ${safeAltRowBg};
          }
          .footer {
            margin-top: 24px;
            font-size: 8pt;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <h1>${safeTitle}</h1>
        <div class="subtitle">
          Period: <xsl:value-of select="//DateRangeStart" />
          <xsl:text disable-output-escaping="yes"> &amp;#x2013; </xsl:text>
          <xsl:value-of select="//DateRangeEnd" />
          <xsl:text disable-output-escaping="yes"> &amp;#160;|&amp;#160; </xsl:text>
          Generated: <xsl:value-of select="//ExportTimestamp" />
        </div>
        <table>
          <thead>
            <tr>${headerCells}</tr>
          </thead>
          <tbody>
            <xsl:for-each select="${safeRowSource}">
${sortBlock}${groupBlock}
              <tr>${dataCells}</tr>
            </xsl:for-each>
          </tbody>
        </table>
        <div class="footer">
          Source: <xsl:value-of select="//SourceSystem" />
          <xsl:text disable-output-escaping="yes"> &amp;#160;|&amp;#160; </xsl:text>
          Version: <xsl:value-of select="//ExportVersion" />
        </div>
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
  headerBg: string,
): string {
  if (!groupBy) return "";

  const safeGroupBy = validateAndReturn(groupBy);
  const safeBorder = escXml(headerBg);

  return `
              <xsl:if test="not(${safeGroupBy} = preceding-sibling::*/${safeGroupBy}) or position()=1">
                <tr>
                  <td colspan="${String(colCount)}" style="background:#f0f0f0;font-weight:bold;padding:10px;font-size:11pt;border-bottom:2px solid ${safeBorder}">
                    <xsl:value-of select="${safeGroupBy}" />
                  </td>
                </tr>
              </xsl:if>`;
}

/**
 * Builds a single data cell element.
 */
function buildDataCell(col: ColumnDefinition): string {
  const safeXpath = validateAndReturn(col.xpath);
  return `<td><xsl:value-of select="${safeXpath}" /></td>`;
}

// Auto-register this generator
registerGenerator("word", generateWordXslt);
