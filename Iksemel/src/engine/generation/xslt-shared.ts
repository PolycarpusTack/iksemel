/**
 * Shared helpers for XSLT generators.
 *
 * Extracted from the four format-specific generators to eliminate
 * copy-paste of identical logic for XPath validation and sort blocks.
 */

import { validateXPath } from "@/utils/xml";

/**
 * Validates an XPath expression and returns it if safe.
 * Throws if the expression contains unsafe functions.
 */
export function validateAndReturn(expr: string): string {
  const result = validateXPath(expr);
  if (!result.valid) {
    throw new Error(`Unsafe XPath expression rejected: ${result.error}`);
  }
  return expr;
}

/**
 * Builds xsl:sort elements for xsl:for-each loops.
 *
 * IMPORTANT: xsl:sort MUST appear as the first child of xsl:for-each,
 * before any xsl:if or other instructions. The XSLT 1.0 specification
 * requires sort keys to precede all other content in xsl:for-each.
 *
 * When groupBy is active, the group field is always the primary sort key
 * so that preceding-sibling group-break detection works correctly.
 *
 * @param sortField - Explicit sort field XPath, or null
 * @param sortDir - Sort direction ("asc" or "desc")
 * @param groupBy - Group field XPath, or null
 * @param indent - Whitespace prefix for each generated line
 */
export function buildSortBlock(
  sortField: string | null,
  sortDir: string,
  groupBy: string | null,
  indent: string = "              ",
): string {
  const sorts: string[] = [];

  if (groupBy) {
    const safeGroupField = validateAndReturn(groupBy);
    sorts.push(
      `${indent}<!-- Sort by group field first: required for correct group-break detection -->`,
    );
    sorts.push(
      `${indent}<xsl:sort select="${safeGroupField}" order="ascending" />`,
    );
  }

  if (sortField && sortField !== groupBy) {
    const safeSortField = validateAndReturn(sortField);
    const safeDir = sortDir === "desc" ? "descending" : "ascending";
    sorts.push(
      `${indent}<xsl:sort select="${safeSortField}" order="${safeDir}" />`,
    );
  }

  return sorts.length > 0 ? "\n" + sorts.join("\n") : "";
}
