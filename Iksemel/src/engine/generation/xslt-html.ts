/**
 * HTML XSLT generator.
 *
 * Generates an XSLT stylesheet that produces a responsive HTML document with:
 * - Responsive container layout with max-width
 * - Sticky table headers using position: sticky
 * - Hover effects on table rows
 * - Print stylesheet for clean printing
 * - Group-break headers with xsl:sort BEFORE detection xsl:if
 * - Alternating row styles
 *
 * All user-provided strings are escaped through escXml.
 * XPath expressions are validated through validateXPath.
 */

import type { GeneratorInput, ColumnDefinition } from "@/types";
import { escXml } from "@/utils/xml";
import { registerGenerator } from "./xslt-registry";
import { validateAndReturn, buildSortBlock } from "./xslt-shared";

/**
 * Generates an XSLT stylesheet targeting responsive HTML output.
 *
 * @param input - Generator input configuration
 * @returns Complete XSLT stylesheet string
 */
export function generateHtmlXslt(input: GeneratorInput): string {
  const { columns, rowSource, style, groupBy, sortBy, title } = input;

  const safeRowSource = validateAndReturn(rowSource || "//Slot");
  const safeTitle = escXml(title || "Export");
  const safeFontFamily = escXml(style.fontFamily || "'Segoe UI', sans-serif");
  const safeHeaderBg = escXml(style.headerBg);
  const safeHeaderFg = escXml(style.headerFg);
  const safeAltRowBg = escXml(style.altRowBg || "#f9f9f9");
  const safeGroupBg = escXml(style.groupBg || "#f0f4ff");

  const sortBlock = buildSortBlock(sortBy?.field ?? null, sortBy?.dir ?? "asc", groupBy, "                  ");
  const groupBlock = buildGroupBlock(groupBy, columns.length, safeHeaderBg, safeGroupBg);

  const headerCells = columns
    .map((col) => `<th>${escXml(col.header)}</th>`)
    .join("");

  const dataCells = columns
    .map((col) => buildDataCell(col))
    .join("");

  const titleSection = style.showTitle
    ? `\n        <div class="header"><h1>${safeTitle}</h1><div class="meta"><xsl:value-of select="//DateRangeStart" /> &#x2013; <xsl:value-of select="//DateRangeEnd" /> &#160;|&#160; <xsl:value-of select="//SourceSystem" /></div></div>`
    : "";

  const footerSection = style.showFooter
    ? `\n        <div class="footer">Generated: <xsl:value-of select="//ExportTimestamp" /></div>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${safeTitle}</title>
        <style>
          /* Reset and base */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: ${safeFontFamily};
            background: #f5f5f7;
            color: #333;
            padding: 32px;
          }

          /* Responsive container */
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 4px rgba(0,0,0,.08);
            overflow: hidden;
          }

          /* Header section */
          .header {
            background: ${safeHeaderBg};
            color: ${safeHeaderFg};
            padding: 24px 32px;
          }
          .header h1 {
            font-size: 20px;
            font-weight: 600;
          }
          .header .meta {
            font-size: 12px;
            opacity: .8;
            margin-top: 4px;
          }

          /* Table layout */
          .table-wrap {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }

          /* Sticky headers */
          th {
            background: #f8f8fa;
            padding: 10px 16px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: .04em;
            border-bottom: 2px solid #e8e8ec;
            position: sticky;
            top: 0;
            z-index: 1;
          }

          /* Data cells */
          td {
            padding: 10px 16px;
            border-bottom: 1px solid #f0f0f2;
            font-size: 13px;
          }

          /* Hover effect */
          tr:hover td {
            background: #f8f9ff;
          }

          /* Alternating rows */
          tbody tr:nth-child(even) td {
            background: ${safeAltRowBg};
          }
          tbody tr:nth-child(even):hover td {
            background: #f0f1ff;
          }

          /* Group rows */
          .group-row td {
            background: ${safeGroupBg};
            font-weight: 600;
            color: ${safeHeaderBg};
            border-bottom: 2px solid ${safeHeaderBg}20;
            padding: 12px 16px;
          }

          /* Footer */
          .footer {
            padding: 16px 32px;
            font-size: 11px;
            color: #999;
            border-top: 1px solid #eee;
          }

          /* Print stylesheet */
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .container {
              box-shadow: none;
              border-radius: 0;
              max-width: none;
            }
            th {
              position: static;
              background: ${safeHeaderBg} !important;
              color: ${safeHeaderFg} !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            tr {
              page-break-inside: avoid;
            }
            .footer {
              page-break-before: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">${titleSection}
          <div class="table-wrap">
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
          </div>${footerSection}
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
  _headerBg: string,
  _groupBg: string,
): string {
  if (!groupBy) return "";

  const safeGroupBy = validateAndReturn(groupBy);

  return `
                  <xsl:if test="not(${safeGroupBy} = preceding-sibling::*/${safeGroupBy}) or position()=1">
                    <tr class="group-row">
                      <td colspan="${String(colCount)}">
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
  const alignAttr = col.align !== "left" ? ` style="text-align:${escXml(col.align)}"` : "";
  return `<td${alignAttr}><xsl:value-of select="${safeXpath}" /></td>`;
}

// Auto-register this generator
registerGenerator("html", generateHtmlXslt);
