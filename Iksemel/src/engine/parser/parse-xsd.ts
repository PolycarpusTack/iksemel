/**
 * Main XSD parser entry point.
 *
 * Takes an XSD text string, parses it into a DOM document,
 * builds the type lookup table, and walks all top-level elements
 * to produce a SchemaNode tree.
 */

import type { ParseResult } from "@/types";
import { validateXmlDocument } from "@/utils";
import type { ParserOptions } from "./types";
import { DEFAULT_PARSER_OPTIONS, freezeNode } from "./types";
import { xsdChildren } from "./namespace";
import { buildTypeLookup } from "./type-lookup";
import { parseElement, createContext, getWarnings, getNodeCount } from "./element-parser";

/**
 * Parses an XSD schema text into a structured SchemaNode tree.
 *
 * @param xsdText - The XSD XML text to parse
 * @param options - Optional parser configuration overrides
 * @returns ParseResult containing the tree, warnings, and stats
 * @throws Error if the XSD is not valid XML
 *
 * @example
 * ```ts
 * const result = parseXSD(xsdText);
 * console.log(result.roots);     // SchemaNode[]
 * console.log(result.warnings);  // ParseWarning[]
 * console.log(result.nodeCount); // number
 * ```
 */
export function parseXSD(
  xsdText: string,
  options: Partial<ParserOptions> = {},
): ParseResult {
  const opts: ParserOptions = { ...DEFAULT_PARSER_OPTIONS, ...options };

  const parsed = validateXmlDocument(xsdText, "text/xml");
  if (!parsed.valid) {
    throw new Error(`Invalid XSD: ${parsed.error ?? "Unknown parse error"}`);
  }
  const doc = parsed.doc;

  // Ensure we have a root element
  const root = doc.documentElement;
  if (!root) {
    throw new Error("Invalid XSD: document has no root element");
  }

  // Build type lookup from top-level definitions
  const typeLookup = buildTypeLookup(root);

  // Create parsing context
  const ctx = createContext(typeLookup, opts);

  // Parse all top-level elements
  const mutableRoots = xsdChildren(root, "element")
    .map((el) => parseElement(el, ctx, 0))
    .filter((node): node is NonNullable<typeof node> => node !== null);

  // Freeze into immutable tree
  const roots = mutableRoots.map(freezeNode);

  return {
    roots,
    warnings: getWarnings(ctx),
    nodeCount: getNodeCount(ctx),
  };
}
