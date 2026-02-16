import type { SchemaNode, ExpansionState } from "@/types";

/**
 * A node in the flattened tree list, carrying its depth for indentation
 * and its expansion state for chevron display.
 */
export interface FlatTreeNode {
  readonly node: SchemaNode;
  readonly depth: number;
  readonly isExpanded: boolean;
}

/**
 * Flattens a schema tree into a flat list of visible nodes.
 * Only includes children of expanded nodes. When a search query is active,
 * filters to matching nodes and their ancestors so the user sees where
 * matches live in the hierarchy.
 *
 * @param roots     - Top-level schema nodes
 * @param expansion - Current expansion state (node id -> expanded boolean)
 * @param searchQuery - Current search filter (empty string = no filter)
 * @param typeFilter - Optional XSD type name to filter by (e.g. "string", "dateTime")
 * @returns Flat ordered list of visible nodes with depth info
 */
export function flattenTree(
  roots: readonly SchemaNode[],
  expansion: ExpansionState,
  searchQuery: string,
  typeFilter?: string | null,
): readonly FlatTreeNode[] {
  const query = searchQuery.trim().toLowerCase();
  const type = typeFilter?.toLowerCase() ?? null;

  // When searching or type-filtering, pre-compute the set of node IDs that should be visible.
  // A node is visible if it matches OR any of its descendants match.
  const visibleIds = (query || type) ? buildVisibleSet(roots, query, type) : null;

  const result: FlatTreeNode[] = [];
  walk(roots, 0, result, expansion, visibleIds);
  return result;
}

/**
 * Builds a set of node IDs that should be visible during search.
 * A node is included if its name or documentation matches the query,
 * or if any descendant matches (ancestor visibility).
 */
function buildVisibleSet(
  roots: readonly SchemaNode[],
  query: string,
  typeFilter: string | null,
): Set<string> {
  const ids = new Set<string>();

  function walkInner(nodes: readonly SchemaNode[]): boolean {
    let anyMatch = false;
    for (const node of nodes) {
      const nameMatch = query ? node.name.toLowerCase().includes(query) || node.documentation.toLowerCase().includes(query) : true;
      const typeMatch = typeFilter ? node.typeName.toLowerCase().includes(typeFilter) : true;
      const directMatch = nameMatch && typeMatch;
      // For type filter: only leaf/simple nodes can match the type directly;
      // complex parents match if any child matches
      const selfMatch = typeFilter ? (node.type === "simple" || node.isAttribute ? directMatch : false) : directMatch;
      const childMatch = node.children.length > 0 && walkInner(node.children);

      if (selfMatch || childMatch) {
        ids.add(node.id);
        anyMatch = true;
      }
    }
    return anyMatch;
  }

  walkInner(roots);
  return ids;
}

/**
 * Recursively walks the tree, appending visible nodes to the result array.
 */
function walk(
  nodes: readonly SchemaNode[],
  depth: number,
  result: FlatTreeNode[],
  expansion: ExpansionState,
  visibleIds: Set<string> | null,
): void {
  for (const node of nodes) {
    // When search filtering is active, skip nodes not in the visible set.
    if (visibleIds !== null && !visibleIds.has(node.id)) {
      continue;
    }

    const isExpanded = expansion[node.id] === true;
    result.push({ node, depth, isExpanded });

    // Only recurse into children if the node is expanded and has children.
    if (isExpanded && node.children.length > 0) {
      walk(node.children, depth + 1, result, expansion, visibleIds);
    }
  }
}
