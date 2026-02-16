/**
 * Data-informed payload estimation.
 *
 * Enhances the static payload estimator by substituting real cardinality
 * values (fetched from a DataProvider) for repeating elements. When
 * cardinality data is unavailable the estimator falls back to the
 * existing static multipliers.
 *
 * Pure TypeScript -- no React imports.
 */

import type { SchemaNode, SelectionState } from "@/types";
import type { DataProvider, CardinalityStats } from "./types";

/* ------------------------------------------------------------------ */
/*  Constants (mirror the static payload module)                       */
/* ------------------------------------------------------------------ */

const DEFAULT_TYPE_WEIGHTS: Readonly<Record<string, number>> = {
  string: 40,
  dateTime: 25,
  date: 10,
  time: 8,
  duration: 10,
  integer: 5,
  int: 5,
  long: 8,
  short: 3,
  byte: 2,
  boolean: 5,
  gYear: 4,
  decimal: 8,
  float: 6,
  double: 8,
};

const DEFAULT_WEIGHT = 20;
const DEFAULT_UNBOUNDED_MULTIPLIER = 50;
const CONTAINER_OVERHEAD = 30;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build a lookup map: element xpath -> CardinalityStats.
 */
function buildCardinalityMap(
  stats: readonly CardinalityStats[],
): ReadonlyMap<string, CardinalityStats> {
  const map = new Map<string, CardinalityStats>();
  for (const s of stats) {
    map.set(s.elementPath, s);
  }
  return map;
}

/**
 * Collect xpaths for all repeating elements that are selected.
 */
function collectRepeatingPaths(
  nodes: readonly SchemaNode[],
  sel: SelectionState,
  prefix: string = "",
): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (!sel[node.id]) continue;
    const xpath = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.maxOccurs === "unbounded" || parseInt(node.maxOccurs, 10) > 1) {
      paths.push(xpath);
    }
    if (node.children.length > 0) {
      paths.push(...collectRepeatingPaths(node.children, sel, xpath));
    }
  }
  return paths;
}

/**
 * Determine the multiplier for a node, preferring real cardinality data.
 */
function getMultiplier(
  node: SchemaNode,
  xpath: string,
  cardMap: ReadonlyMap<string, CardinalityStats>,
): number {
  const card = cardMap.get(xpath);
  if (card) return card.avgCount;

  if (node.maxOccurs === "unbounded") return DEFAULT_UNBOUNDED_MULTIPLIER;
  return parseInt(node.maxOccurs, 10) || 1;
}

/**
 * Recursive weight estimation with cardinality overrides.
 */
function estimateNodeWeight(
  node: SchemaNode,
  sel: SelectionState,
  cardMap: ReadonlyMap<string, CardinalityStats>,
  prefix: string,
): number {
  if (!sel[node.id]) return 0;

  const xpath = prefix ? `${prefix}/${node.name}` : node.name;
  const rep = getMultiplier(node, xpath, cardMap);

  if (!node.children.length) {
    const typeWeight = DEFAULT_TYPE_WEIGHTS[node.typeName] ?? DEFAULT_WEIGHT;
    return typeWeight * rep;
  }

  let childrenWeight = 0;
  for (const child of node.children) {
    childrenWeight += estimateNodeWeight(child, sel, cardMap, xpath);
  }

  return Math.max(childrenWeight, CONTAINER_OVERHEAD) * rep;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Estimate payload size using real cardinality when available,
 * falling back to static multipliers.
 */
export async function estimatePayloadWithData(
  schema: readonly SchemaNode[],
  selection: SelectionState,
  provider: DataProvider,
): Promise<{ estimatedKb: number; source: "data" | "static" }> {
  // Collect paths for all selected repeating elements
  const repeatingPaths = collectRepeatingPaths(schema, selection);

  let cardMap: ReadonlyMap<string, CardinalityStats> = new Map();
  let source: "data" | "static" = "static";

  if (repeatingPaths.length > 0) {
    try {
      const stats = await provider.fetchCardinality(repeatingPaths);
      if (stats.length > 0) {
        cardMap = buildCardinalityMap(stats);
        source = "data";
      }
    } catch {
      // Fall back to static estimation
    }
  }

  // Compute total weight in bytes
  let totalBytes = 0;
  for (const root of schema) {
    totalBytes += estimateNodeWeight(root, selection, cardMap, "");
  }

  return {
    estimatedKb: Math.round(totalBytes / 1024),
    source,
  };
}
