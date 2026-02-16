/**
 * CSV XSLT generator.
 *
 * Generates an XSLT stylesheet that produces RFC 4180 compliant CSV output.
 *
 * Key design decisions:
 * - Uses proper RFC 4180 double-quote escaping: fields containing the delimiter,
 *   double quotes, or newlines are enclosed in double quotes, with internal
 *   double quotes doubled ("" instead of "). This replaces the prototype's
 *   `translate(xpath, '"', "'")` approach which silently corrupted data.
 * - Configurable delimiter (default: comma)
 * - Optional UTF-8 BOM for Excel compatibility
 * - Configurable line endings (CRLF per RFC 4180, or LF)
 *
 * All user-provided strings are escaped through escXml.
 * XPath expressions are validated through validateXPath.
 */

import type { GeneratorInput, ColumnDefinition } from "@/types";
import { escXml } from "@/utils/xml";
import { registerGenerator } from "./xslt-registry";
import { validateAndReturn, buildSortBlock } from "./xslt-shared";

/**
 * Options specific to CSV generation, derived from StyleConfig.
 */
interface CsvOptions {
  readonly delimiter: string;
  readonly lineEnding: "crlf" | "lf";
  readonly includeBom: boolean;
}

/**
 * Generates an XSLT stylesheet targeting RFC 4180 CSV output.
 *
 * The generated XSLT uses a named template "escape-csv-field" that implements
 * proper RFC 4180 quoting:
 * 1. If the field contains a double quote, the delimiter, or a newline,
 *    the entire field is wrapped in double quotes.
 * 2. Any double quote within the field is doubled ("").
 *
 * This is achieved in XSLT 1.0 using a recursive named template for the
 * double-quote doubling, since XSLT 1.0 lacks a replace() function.
 *
 * @param input - Generator input configuration
 * @returns Complete XSLT stylesheet string
 */
export function generateCsvXslt(input: GeneratorInput): string {
  const { columns, rowSource, style, sortBy, groupBy } = input;

  const safeRowSource = validateAndReturn(rowSource || "//Slot");
  const opts = parseCsvOptions(style.delimiter, style.quoteChar);

  const lineEndEntity = opts.lineEnding === "crlf" ? "&#13;&#10;" : "&#10;";
  const bomText = opts.includeBom
    ? `\n    <!-- UTF-8 BOM for Excel compatibility -->\n    <xsl:text>&#xFEFF;</xsl:text>`
    : "";

  const headerRow = buildHeaderRow(columns, opts.delimiter);
  const dataFields = buildDataFields(columns, opts.delimiter);
  const sortBlock = buildSortBlock(sortBy?.field ?? null, sortBy?.dir ?? "asc", groupBy, "      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="text" encoding="UTF-8" />
  <xsl:strip-space elements="*" />

  <!--
    RFC 4180 CSV field escaping template.
    Fields containing double quotes, the delimiter, or newlines are enclosed
    in double quotes. Internal double quotes are doubled per RFC 4180 Section 2.
  -->

  <!-- Named template: double all double-quote characters in a string -->
  <xsl:template name="double-quotes">
    <xsl:param name="text" />
    <xsl:choose>
      <xsl:when test="contains($text, '&quot;')">
        <xsl:value-of select="substring-before($text, '&quot;')" />
        <xsl:text>&quot;&quot;</xsl:text>
        <xsl:call-template name="double-quotes">
          <xsl:with-param name="text" select="substring-after($text, '&quot;')" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!--
    Named template: escape a CSV field per RFC 4180.
    If the value contains a double quote, the delimiter character, or a newline,
    wrap the entire field in double quotes and double any internal quotes.
  -->
  <xsl:template name="escape-csv-field">
    <xsl:param name="value" />
    <xsl:choose>
      <xsl:when test="contains($value, '&quot;') or contains($value, '${escXml(opts.delimiter)}') or contains($value, '&#10;') or contains($value, '&#13;')">
        <xsl:text>&quot;</xsl:text>
        <xsl:call-template name="double-quotes">
          <xsl:with-param name="text" select="$value" />
        </xsl:call-template>
        <xsl:text>&quot;</xsl:text>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$value" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="/">${bomText}
    <!-- Header row -->
    <xsl:text>${headerRow}${lineEndEntity}</xsl:text>

    <!-- Data rows -->
    <xsl:for-each select="${safeRowSource}">
${sortBlock}
      ${dataFields}
      <xsl:text>${lineEndEntity}</xsl:text>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>`;
}

/**
 * Parses CSV options from style configuration values.
 */
function parseCsvOptions(delimiter: string, _quoteChar: string): CsvOptions {
  return {
    delimiter: delimiter || ",",
    lineEnding: "crlf",
    includeBom: false,
  };
}

/**
 * Builds the static header row text.
 * Headers are always quoted since they are user-provided strings
 * that could contain the delimiter.
 */
function buildHeaderRow(
  columns: readonly ColumnDefinition[],
  delimiter: string,
): string {
  return columns
    .map((col) => {
      // Double any quotes in the header text, then wrap in quotes
      const escaped = escXml(col.header).replace(/&quot;/g, "&quot;&quot;");
      return `&quot;${escaped}&quot;`;
    })
    .join(escXml(delimiter));
}

/**
 * Builds the xsl:call-template instructions for each data column.
 * Each field is passed through the escape-csv-field template for
 * proper RFC 4180 quoting.
 */
function buildDataFields(
  columns: readonly ColumnDefinition[],
  delimiter: string,
): string {
  const safeDelimiter = escXml(delimiter);
  return columns
    .map((col, index) => {
      const safeXpath = validateAndReturn(col.xpath);
      const delimiterText =
        index > 0
          ? `<xsl:text>${safeDelimiter}</xsl:text>\n      `
          : "";
      return (
        `${delimiterText}<xsl:call-template name="escape-csv-field">` +
        `\n        <xsl:with-param name="value" select="${safeXpath}" />` +
        `\n      </xsl:call-template>`
      );
    })
    .join("\n      ");
}

// Auto-register this generator
registerGenerator("csv", generateCsvXslt);
