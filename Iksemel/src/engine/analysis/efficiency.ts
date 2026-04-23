/**
 * Filter efficiency scoring and analysis.
 *
 * Provides grades and recommendations to help users write more
 * efficient XML filters by analyzing their selection patterns.
 */

import type { SchemaNode, SelectionState } from "@/types";
import { estimateSelectedWeight } from "./payload";

export interface EfficiencyScore {
  /** Letter grade A-F */
  readonly grade: "A" | "B" | "C" | "D" | "F";
  /** Numeric score 0-100 */
  readonly score: number;
  /** Key factors affecting the score */
  readonly factors: readonly EfficiencyFactor[];
  /** Recommendations for improvement */
  readonly recommendations: readonly string[];
}

export interface EfficiencyFactor {
  /** Factor identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Impact on score (-100 to +100) */
  readonly impact: number;
  /** Description of the factor */
  readonly description: string;
}

/**
 * Analyzes filter efficiency and returns a scored assessment.
 */
export function analyzeFilterEfficiency(
  roots: readonly SchemaNode[],
  selection: SelectionState,
): EfficiencyScore {
  const factors: EfficiencyFactor[] = [];
  const recommendations: string[] = [];
  
  // Calculate basic metrics
  const totalNodes = countAllNodes(roots);
  const selectedNodes = countSelectedNodes(roots, selection);
  const selectionRatio = totalNodes > 0 ? selectedNodes / totalNodes : 0;
  
  // Factor 1: Selection ratio (selecting too much is bad)
  let selectionImpact = 0;
  if (selectionRatio > 0.9) {
    selectionImpact = -40;
    recommendations.push("Consider being more selective - you've chosen over 90% of available fields.");
  } else if (selectionRatio > 0.7) {
    selectionImpact = -20;
    recommendations.push("Your selection is quite broad. Review if all fields are necessary.");
  } else if (selectionRatio < 0.3) {
    selectionImpact = 20;
  } else {
    selectionImpact = 10;
  }
  
  factors.push({
    id: "selection_ratio",
    name: "Selection Ratio",
    impact: selectionImpact,
    description: `${(selectionRatio * 100).toFixed(0)}% of fields selected`,
  });
  
  // Factor 2: Payload explosion detection
  const explosions = detectPayloadContributors(roots, selection);
  let explosionImpact = 0;
  if (explosions.length > 0) {
    const topExplosion = explosions[0];
    if (topExplosion.contributionPct > 70) {
      explosionImpact = -30;
      recommendations.push(`"${topExplosion.nodeName}" contributes ${topExplosion.contributionPct}% of payload size. Consider filtering or excluding it.`);
    } else if (topExplosion.contributionPct > 40) {
      explosionImpact = -15;
      recommendations.push(`"${topExplosion.nodeName}" is a major contributor (${topExplosion.contributionPct}%) to payload size.`);
    }
  } else {
    explosionImpact = 10;
  }
  
  factors.push({
    id: "payload_distribution",
    name: "Payload Distribution",
    impact: explosionImpact,
    description: explosions.length > 0 
      ? `${explosions.length} high-impact element(s) detected`
      : "Well-balanced payload distribution",
  });
  
  // Factor 3: Filter usage (are they using filters effectively?)
  // This would need filterValues state - for now we'll skip or pass as parameter
  
  // Factor 4: Repeating element handling
  const repeatingStats = analyzeRepeatingElements(roots, selection);
  let repeatingImpact = 0;
  if (repeatingStats.unfilteredRepeatingCount > 0) {
    repeatingImpact = -20;
    recommendations.push(`${repeatingStats.unfilteredRepeatingCount} repeating element(s) have no filters. Add filters to reduce data volume.`);
  } else if (repeatingStats.filteredRepeatingCount > 0) {
    repeatingImpact = 15;
  }
  
  factors.push({
    id: "repeating_elements",
    name: "Repeating Elements",
    impact: repeatingImpact,
    description: `${repeatingStats.filteredRepeatingCount}/${repeatingStats.totalRepeatingCount} repeating elements filtered`,
  });
  
  // Factor 5: Required parent efficiency
  const orphanStats = analyzeOrphanSelections(roots, selection);
  let orphanImpact = 0;
  if (orphanStats.orphanedParents > 0) {
    orphanImpact = -10;
    recommendations.push(`${orphanStats.orphanedParents} parent container(s) selected without useful children. Deselect empty containers.`);
  }
  
  factors.push({
    id: "container_efficiency",
    name: "Container Efficiency",
    impact: orphanImpact,
    description: orphanStats.orphanedParents === 0 
      ? "No empty containers" 
      : `${orphanStats.orphanedParents} empty container(s)`,
  });
  
  // Calculate base score
  const baseScore = 70; // Start at C+
  const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
  const finalScore = Math.max(0, Math.min(100, baseScore + totalImpact));
  
  // Determine grade
  let grade: "A" | "B" | "C" | "D" | "F";
  if (finalScore >= 90) grade = "A";
  else if (finalScore >= 80) grade = "B";
  else if (finalScore >= 70) grade = "C";
  else if (finalScore >= 60) grade = "D";
  else grade = "F";
  
  // Add general recommendations based on grade
  if (grade === "F" || grade === "D") {
    recommendations.unshift("Your export configuration needs optimization. Review the recommendations below:");
  } else if (grade === "A") {
    recommendations.unshift("Excellent! Your filter configuration is well-optimized.");
  }
  
  return {
    grade,
    score: finalScore,
    factors,
    recommendations,
  };
}

/**
 * Detects elements that contribute disproportionately to payload size.
 */
function detectPayloadContributors(
  roots: readonly SchemaNode[],
  selection: SelectionState,
): Array<{ nodeId: string; nodeName: string; contributionPct: number }> {
  const totalSelectedWeight = roots.reduce(
    (sum, r) => sum + estimateSelectedWeight(r, selection),
    0,
  );
  
  if (totalSelectedWeight === 0) return [];
  
  const contributors: Array<{ nodeId: string; nodeName: string; contributionPct: number }> = [];
  
  function walk(node: SchemaNode): void {
    if (!selection[node.id]) return;
    
    const isRepeating = node.maxOccurs === "unbounded" || parseInt(node.maxOccurs, 10) > 1;
    if (isRepeating && node.children.length > 0) {
      const nodeWeight = estimateSelectedWeight(node, selection);
      const pct = Math.round((nodeWeight / totalSelectedWeight) * 100);
      if (pct >= 20) { // Lower threshold for analysis view
        contributors.push({
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
  
  return contributors.sort((a, b) => b.contributionPct - a.contributionPct);
}

/**
 * Analyzes repeating elements in the selection.
 */
function analyzeRepeatingElements(
  roots: readonly SchemaNode[],
  selection: SelectionState,
): {
  totalRepeatingCount: number;
  filteredRepeatingCount: number;
  unfilteredRepeatingCount: number;
} {
  let total = 0;
  let filtered = 0;
  
  function walk(node: SchemaNode): void {
    const isRepeating = node.maxOccurs === "unbounded" || parseInt(node.maxOccurs, 10) > 1;
    if (isRepeating && selection[node.id]) {
      total++;
      // For now, assume if node has children selected, it's "filtered"
      // In real implementation, check filterValues
      const hasSelectedChildren = node.children.some(c => selection[c.id]);
      if (hasSelectedChildren) {
        filtered++;
      }
    }
    
    for (const child of node.children) {
      walk(child);
    }
  }
  
  for (const root of roots) {
    walk(root);
  }
  
  return {
    totalRepeatingCount: total,
    filteredRepeatingCount: filtered,
    unfilteredRepeatingCount: total - filtered,
  };
}

/**
 * Analyzes selections where parents are selected but few children are.
 */
function analyzeOrphanSelections(
  roots: readonly SchemaNode[],
  selection: SelectionState,
): {
  orphanedParents: number;
} {
  let orphaned = 0;
  
  function walk(node: SchemaNode): void {
    if (!selection[node.id] || node.children.length === 0) return;
    
    const selectedChildren = node.children.filter(c => selection[c.id]).length;
    const selectionRate = selectedChildren / node.children.length;
    
    // If less than 20% of children selected, parent might be unnecessarily selected
    if (selectionRate < 0.2 && selectedChildren > 0) {
      orphaned++;
    }
    
    for (const child of node.children) {
      walk(child);
    }
  }
  
  for (const root of roots) {
    walk(root);
  }
  
  return { orphanedParents: orphaned };
}

/**
 * Counts all nodes in the schema tree.
 */
function countAllNodes(roots: readonly SchemaNode[]): number {
  let count = 0;
  
  function walk(node: SchemaNode): void {
    count++;
    for (const child of node.children) {
      walk(child);
    }
  }
  
  for (const root of roots) {
    walk(root);
  }
  
  return count;
}

/**
 * Counts selected nodes in the schema tree.
 */
function countSelectedNodes(roots: readonly SchemaNode[], selection: SelectionState): number {
  let count = 0;
  
  function walk(node: SchemaNode): void {
    if (selection[node.id]) count++;
    for (const child of node.children) {
      walk(child);
    }
  }
  
  for (const root of roots) {
    walk(root);
  }
  
  return count;
}

/**
 * Simulates the impact of adding/removing a filter.
 */
export function simulateFilterImpact(
  roots: readonly SchemaNode[],
  currentSelection: SelectionState,
  modifiedSelection: SelectionState,
): {
  sizeBefore: number;
  sizeAfter: number;
  reductionBytes: number;
  reductionPct: number;
} {
  const sizeBefore = roots.reduce(
    (sum, r) => sum + estimateSelectedWeight(r, currentSelection),
    0,
  );
  
  const sizeAfter = roots.reduce(
    (sum, r) => sum + estimateSelectedWeight(r, modifiedSelection),
    0,
  );
  
  const reductionBytes = sizeBefore - sizeAfter;
  const reductionPct = sizeBefore > 0 ? (reductionBytes / sizeBefore) * 100 : 0;
  
  return {
    sizeBefore,
    sizeAfter,
    reductionBytes,
    reductionPct,
  };
}
