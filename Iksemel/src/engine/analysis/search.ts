/**
 * Schema search functionality.
 *
 * Provides type-ahead search across element names and documentation
 * text in the schema tree.
 */

import type { SchemaNode } from "@/types";

/**
 * A search result referencing a matching schema node.
 */
export interface SearchResult {
  /** The matching node */
  readonly node: SchemaNode;
  /** The path to this node from root */
  readonly path: readonly string[];
  /** Whether the match was in the name or documentation */
  readonly matchIn: "name" | "documentation";
}

/**
 * Searches the schema tree for nodes matching a query string.
 * Matches against element names and documentation text (case-insensitive).
 *
 * @param roots - Root schema nodes to search
 * @param query - Search query (case-insensitive)
 * @returns Array of matching search results
 */
export function searchSchema(
  roots: readonly SchemaNode[],
  query: string,
): SearchResult[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  function walk(nodes: readonly SchemaNode[], path: string[]): void {
    for (const node of nodes) {
      const currentPath = [...path, node.name];

      if (node.name.toLowerCase().includes(lowerQuery)) {
        results.push({ node, path: currentPath, matchIn: "name" });
      } else if (node.documentation.toLowerCase().includes(lowerQuery)) {
        results.push({ node, path: currentPath, matchIn: "documentation" });
      }

      if (node.children.length > 0) {
        walk(node.children, currentPath);
      }
    }
  }

  walk(roots, []);
  return results;
}
