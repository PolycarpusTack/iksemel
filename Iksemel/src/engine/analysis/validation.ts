/**
 * Filter completeness validation.
 *
 * Detects required elements (minOccurs > 0) that are ancestors
 * of selected elements but are not themselves selected.
 */

import type { SchemaNode, SelectionState } from "@/types";

/**
 * A validation warning about a missing required ancestor.
 */
export interface ValidationWarning {
  /** The required element that is missing */
  readonly node: SchemaNode;
  /** Path to the required element */
  readonly path: readonly string[];
  /** Human-readable warning message */
  readonly message: string;
}

/**
 * Validates that all required ancestors of selected elements
 * are themselves present in the selection.
 *
 * @param roots - Schema tree roots
 * @param sel - Current selection state
 * @returns Array of validation warnings
 */
export function validateFilterCompleteness(
  roots: readonly SchemaNode[],
  sel: SelectionState,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  function walk(nodes: readonly SchemaNode[], path: string[], ancestorRequired: boolean): void {
    for (const node of nodes) {
      const currentPath = [...path, node.name];
      const isRequired = node.minOccurs !== "0";
      const isSelected = Boolean(sel[node.id]);
      const hasSelectedDescendant = hasSelectedChild(node, sel);

      // Warn if: required, has selected descendants, but is not itself selected
      if (isRequired && hasSelectedDescendant && !isSelected) {
        warnings.push({
          node,
          path: currentPath,
          message: `Required element "${node.name}" is not selected but contains selected children`,
        });
      }

      // Warn if: not selected, but is a required ancestor in the path to selected leaves
      if (ancestorRequired && !isRequired && !isSelected && hasSelectedDescendant) {
        // This is OK — optional ancestors don't need to be selected
      }

      if (node.children.length > 0) {
        walk(node.children, currentPath, isRequired || ancestorRequired);
      }
    }
  }

  walk(roots, [], false);
  return warnings;
}

/**
 * Checks if a node has any selected descendants.
 */
function hasSelectedChild(node: SchemaNode, sel: SelectionState): boolean {
  for (const child of node.children) {
    if (sel[child.id]) return true;
    if (hasSelectedChild(child, sel)) return true;
  }
  return false;
}
