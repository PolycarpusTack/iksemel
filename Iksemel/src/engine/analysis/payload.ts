/**
 * Payload estimation and analysis.
 *
 * Estimates the XML payload size based on schema structure and selection,
 * using configurable per-type weights and per-element multiplier overrides.
 * All functions are pure — no React dependencies.
 */

import type { SchemaNode, SelectionState } from "@/types";

/**
 * Default byte weights for XSD simple types.
 * Represents estimated bytes per instance of that type.
 */
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

/** Default weight for unrecognised types */
const DEFAULT_WEIGHT = 20;

/** Default multiplier for unbounded elements */
const DEFAULT_UNBOUNDED_MULTIPLIER = 50;

/** Overhead bytes per container element (opening + closing tags) */
const CONTAINER_OVERHEAD = 30;

/**
 * Configuration for payload estimation.
 */
export interface PayloadConfig {
  /** Custom per-type byte weights (merged with defaults) */
  readonly typeWeights?: Readonly<Record<string, number>>;
  /** Per-element multiplier overrides (keyed by node ID) */
  readonly multiplierOverrides?: Readonly<Record<string, number>>;
  /** Default multiplier for unbounded elements (default: 50) */
  readonly defaultUnboundedMultiplier?: number;
}

/**
 * Estimates the total payload weight of a schema tree.
 */
export function estimateWeight(
  node: SchemaNode,
  config: PayloadConfig = {},
): number {
  const weights = { ...DEFAULT_TYPE_WEIGHTS, ...config.typeWeights };
  const unboundedMultiplier = config.defaultUnboundedMultiplier ?? DEFAULT_UNBOUNDED_MULTIPLIER;

  return estimateNodeWeight(node, weights, config.multiplierOverrides ?? {}, unboundedMultiplier);
}

/**
 * Estimates the payload weight of selected nodes only.
 */
export function estimateSelectedWeight(
  node: SchemaNode,
  sel: SelectionState,
  config: PayloadConfig = {},
): number {
  if (!sel[node.id]) return 0;

  const weights = { ...DEFAULT_TYPE_WEIGHTS, ...config.typeWeights };
  const unboundedMultiplier = config.defaultUnboundedMultiplier ?? DEFAULT_UNBOUNDED_MULTIPLIER;

  return estimateSelectedNodeWeight(
    node,
    sel,
    weights,
    config.multiplierOverrides ?? {},
    unboundedMultiplier,
  );
}

function getMultiplier(
  node: SchemaNode,
  overrides: Readonly<Record<string, number>>,
  unboundedMultiplier: number,
): number {
  if (overrides[node.id] !== undefined) {
    return overrides[node.id] ?? unboundedMultiplier;
  }
  if (node.maxOccurs === "unbounded") return unboundedMultiplier;
  return parseInt(node.maxOccurs, 10) || 1;
}

function estimateNodeWeight(
  node: SchemaNode,
  weights: Record<string, number>,
  overrides: Readonly<Record<string, number>>,
  unboundedMultiplier: number,
): number {
  const rep = getMultiplier(node, overrides, unboundedMultiplier);

  if (!node.children.length) {
    const typeWeight = weights[node.typeName] ?? DEFAULT_WEIGHT;
    return typeWeight * rep;
  }

  const childrenWeight = node.children.reduce(
    (sum, child) => sum + estimateNodeWeight(child, weights, overrides, unboundedMultiplier),
    0,
  );

  return (childrenWeight + CONTAINER_OVERHEAD) * rep;
}

function estimateSelectedNodeWeight(
  node: SchemaNode,
  sel: SelectionState,
  weights: Record<string, number>,
  overrides: Readonly<Record<string, number>>,
  unboundedMultiplier: number,
): number {
  if (!sel[node.id]) return 0;

  const rep = getMultiplier(node, overrides, unboundedMultiplier);

  if (!node.children.length) {
    const typeWeight = weights[node.typeName] ?? DEFAULT_WEIGHT;
    return typeWeight * rep;
  }

  const childrenWeight = node.children.reduce(
    (sum, child) =>
      sum + estimateSelectedNodeWeight(child, sel, weights, overrides, unboundedMultiplier),
    0,
  );

  if (childrenWeight === 0) return 0;
  return (childrenWeight + CONTAINER_OVERHEAD) * rep;
}

/**
 * Computes the payload reduction percentage.
 *
 * @returns Percentage reduction (0-100), or 0 if total is 0
 */
export function computeReduction(
  roots: readonly SchemaNode[],
  sel: SelectionState,
  config: PayloadConfig = {},
): number {
  const totalWeight = roots.reduce((sum, r) => sum + estimateWeight(r, config), 0);
  if (totalWeight === 0) return 0;

  const selectedWeight = roots.reduce(
    (sum, r) => sum + estimateSelectedWeight(r, sel, config),
    0,
  );

  return Math.round((1 - selectedWeight / totalWeight) * 100);
}

/**
 * Detects repeating elements in the selection that contribute
 * more than the threshold percentage of the total estimated payload.
 */
export function detectPayloadExplosions(
  roots: readonly SchemaNode[],
  sel: SelectionState,
  config: PayloadConfig = {},
  thresholdPct = 40,
): Array<{
  readonly nodeId: string;
  readonly nodeName: string;
  readonly contributionPct: number;
}> {
  const totalSelectedWeight = roots.reduce(
    (sum, r) => sum + estimateSelectedWeight(r, sel, config),
    0,
  );

  if (totalSelectedWeight === 0) return [];

  const explosions: Array<{
    readonly nodeId: string;
    readonly nodeName: string;
    readonly contributionPct: number;
  }> = [];

  function walk(node: SchemaNode): void {
    if (!sel[node.id]) return;

    const isRepeating = node.maxOccurs === "unbounded" || parseInt(node.maxOccurs, 10) > 1;
    if (isRepeating) {
      const nodeWeight = estimateSelectedWeight(node, sel, config);
      const pct = Math.round((nodeWeight / totalSelectedWeight) * 100);
      if (pct >= thresholdPct) {
        explosions.push({
          nodeId: node.id,
          nodeName: node.name,
          contributionPct: pct,
        });
      }
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  for (const root of roots) {
    walk(root);
  }

  return explosions;
}

/**
 * Formats a byte count into a human-readable string (B, KB, or MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Estimates the total payload size across all root nodes.
 */
export function estimateTotalSize(
  roots: readonly SchemaNode[],
  config: PayloadConfig = {},
): number {
  return roots.reduce((sum, r) => sum + estimateWeight(r, config), 0);
}

/**
 * Estimates the selected payload size across all root nodes.
 */
export function estimateSelectedSize(
  roots: readonly SchemaNode[],
  sel: SelectionState,
  config: PayloadConfig = {},
): number {
  return roots.reduce((sum, r) => sum + estimateSelectedWeight(r, sel, config), 0);
}
