/**
 * XML and XPath escaping utilities.
 *
 * These functions ensure that user-provided strings are safely embedded
 * in generated XML and XPath expressions without injection risks.
 */

/**
 * Escapes a string for safe embedding in XML content or attribute values.
 * Handles the five XML special characters: & < > " '
 *
 * @param value - The string to escape (null/undefined become empty string)
 * @returns The XML-safe escaped string
 *
 * @example
 * ```ts
 * escXml('AT&T')        // 'AT&amp;T'
 * escXml('<script>')     // '&lt;script&gt;'
 * escXml('"hello"')      // '&quot;hello&quot;'
 * escXml("it's")         // 'it&apos;s'
 * ```
 */
export function escXml(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Set of XPath functions that are considered unsafe for use in
 * generated XSLT expressions. These functions can access external
 * resources or system information and must be rejected.
 */
const UNSAFE_XPATH_FUNCTIONS: ReadonlySet<string> = new Set([
  "document",
  "system-property",
  "unparsed-entity-uri",
  "unparsed-entity-public-id",
  "generate-id",
  "key",
  "current",
  "format-number",
  "function-available",
  "element-available",
]);

/**
 * Pattern matching unsafe XPath function calls.
 * Matches function names followed by opening parenthesis,
 * accounting for optional whitespace.
 */
const UNSAFE_XPATH_PATTERN = new RegExp(
  `(?:^|[^a-zA-Z_-])(?:${[...UNSAFE_XPATH_FUNCTIONS].join("|")})\\s*\\(`,
  "i",
);

/**
 * Result of XPath expression validation.
 */
export interface XPathValidationResult {
  /** Whether the expression is safe to use */
  readonly valid: boolean;
  /** Error message if invalid */
  readonly error?: string;
}

/**
 * Validates an XPath expression for safe use in generated XSLT.
 *
 * Checks for:
 * - Empty expressions
 * - Unsafe XPath functions (document(), system-property(), etc.)
 * - Unbalanced brackets/parentheses
 * - Suspicious patterns that could indicate injection attempts
 *
 * @param expression - The XPath expression to validate
 * @returns Validation result with valid flag and optional error message
 *
 * @example
 * ```ts
 * validateXPath('Programme/Title')           // { valid: true }
 * validateXPath('document("http://evil")')   // { valid: false, error: '...' }
 * validateXPath('')                          // { valid: false, error: '...' }
 * ```
 */
export function validateXPath(expression: string): XPathValidationResult {
  if (!expression.trim()) {
    return { valid: false, error: "XPath expression cannot be empty" };
  }

  // Check for unsafe functions
  if (UNSAFE_XPATH_PATTERN.test(expression)) {
    const matched = [...UNSAFE_XPATH_FUNCTIONS].find((fn) =>
      new RegExp(`(?:^|[^a-zA-Z_-])${fn}\\s*\\(`, "i").test(expression),
    );
    return {
      valid: false,
      error: `Unsafe XPath function '${matched ?? "unknown"}()' is not allowed in generated XSLT`,
    };
  }

  // Check for unbalanced brackets
  let parenDepth = 0;
  let bracketDepth = 0;
  for (const char of expression) {
    if (char === "(") parenDepth++;
    if (char === ")") parenDepth--;
    if (char === "[") bracketDepth++;
    if (char === "]") bracketDepth--;
    if (parenDepth < 0 || bracketDepth < 0) {
      return { valid: false, error: "Unbalanced brackets or parentheses in XPath expression" };
    }
  }
  if (parenDepth !== 0 || bracketDepth !== 0) {
    return { valid: false, error: "Unbalanced brackets or parentheses in XPath expression" };
  }

  return { valid: true };
}

/**
 * Sanitizes an XPath expression by validating it and returning it
 * only if safe. Throws on invalid expressions.
 *
 * @param expression - The XPath expression to sanitize
 * @returns The validated expression (unchanged if safe)
 * @throws Error if the expression is unsafe
 *
 * @example
 * ```ts
 * sanitizeXPath('Programme/Title')  // 'Programme/Title'
 * sanitizeXPath('document("x")')    // throws Error
 * ```
 */
export function sanitizeXPath(expression: string): string {
  const result = validateXPath(expression);
  if (!result.valid) {
    throw new Error(result.error);
  }
  return expression;
}
