/**
 * Selection state management.
 *
 * Pure functions for managing tri-state selection on a SchemaNode tree.
 * All functions follow the pattern: (currentState, action) => newState
 * with no side effects — ready for undo/redo and React integration.
 */

import type { SchemaNode, SelectionState, CheckState } from "@/types";

/**
 * Computes the tri-state check state for a node based on current selection.
 *
 * - checked: node itself is selected AND all descendants are selected
 * - partial: some (but not all) descendants are selected, or node is selected but not all children
 * - unchecked: node and no descendants are selected
 */
export function getCheckState(node: SchemaNode, sel: SelectionState): CheckState {
  if (!node.children.length) {
    return sel[node.id] ? "checked" : "unchecked";
  }

  const childStates = node.children.map((c) => getCheckState(c, sel));
  const anySelected = childStates.some((s) => s === "checked" || s === "partial");
  const allChecked = childStates.every((s) => s === "checked");

  if (!anySelected) {
    return sel[node.id] ? "partial" : "unchecked";
  }
  if (allChecked && sel[node.id]) {
    return "checked";
  }
  return "partial";
}

/**
 * Toggles selection of a node and all its descendants.
 *
 * If the node is currently checked, unchecks it and all descendants.
 * If the node is unchecked or partial, checks it and all descendants,
 * and ensures all ancestor nodes are also selected.
 *
 * @returns New immutable selection state
 */
export function toggleNode(
  node: SchemaNode,
  roots: readonly SchemaNode[],
  sel: SelectionState,
): SelectionState {
  const next = { ...sel };
  const shouldSelect = getCheckState(node, sel) !== "checked";

  // Set this node and all descendants
  setAll(node, shouldSelect, next);

  // If selecting, ensure all ancestors are also selected
  if (shouldSelect) {
    selectAncestors(node.id, roots, next);
  }

  return next;
}

/**
 * Selects all nodes in the tree.
 */
export function selectAll(roots: readonly SchemaNode[]): SelectionState {
  const next: Record<string, boolean | undefined> = {};
  for (const root of roots) {
    setAll(root, true, next);
  }
  return next;
}

/**
 * Clears all selections.
 */
export function clearAll(): SelectionState {
  return {};
}

/**
 * Recursively sets selection state for a node and all descendants.
 */
function setAll(node: SchemaNode, value: boolean, state: Record<string, boolean | undefined>): void {
  state[node.id] = value;
  for (const child of node.children) {
    setAll(child, value, state);
  }
}

/**
 * Ensures all ancestors of a target node are selected.
 * Walks the tree from roots to find the path to the target.
 */
function selectAncestors(
  targetId: string,
  nodes: readonly SchemaNode[],
  state: Record<string, boolean | undefined>,
  path: SchemaNode[] = [],
): boolean {
  for (const node of nodes) {
    if (node.id === targetId) {
      // Found the target — select all ancestors in path
      for (const ancestor of path) {
        state[ancestor.id] = true;
      }
      return true;
    }
    if (node.children.length > 0) {
      if (selectAncestors(targetId, node.children, state, [...path, node])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Counts the total number of nodes in a tree.
 */
export function countAll(nodes: readonly SchemaNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1 + countAll(node.children);
  }
  return count;
}

/**
 * Counts the number of selected nodes in a tree.
 */
export function countSelected(nodes: readonly SchemaNode[], sel: SelectionState): number {
  let count = 0;
  for (const node of nodes) {
    if (sel[node.id]) count++;
    count += countSelected(node.children, sel);
  }
  return count;
}

/**
 * Gets all selected leaf nodes with their full paths.
 */
export function getSelectedLeaves(
  nodes: readonly SchemaNode[],
  sel: SelectionState,
  path: string[] = [],
): Array<{
  readonly id: string;
  readonly name: string;
  readonly path: readonly string[];
  readonly xpath: string;
  readonly typeName: string;
}> {
  const leaves: Array<{
    readonly id: string;
    readonly name: string;
    readonly path: readonly string[];
    readonly xpath: string;
    readonly typeName: string;
  }> = [];

  for (const node of nodes) {
    if (!sel[node.id]) continue;
    const currentPath = [...path, node.name];

    if (!node.children.length) {
      leaves.push({
        id: node.id,
        name: node.name,
        path: currentPath,
        xpath: currentPath.join("/"),
        typeName: node.typeName,
      });
    } else {
      leaves.push(...getSelectedLeaves(node.children, sel, currentPath));
    }
  }

  return leaves;
}

/**
 * Gets all repeating elements in the schema tree.
 */
export function getRepeatingElements(
  nodes: readonly SchemaNode[],
  path: string[] = [],
): Array<{
  readonly id: string;
  readonly name: string;
  readonly path: readonly string[];
  readonly xpath: string;
}> {
  const reps: Array<{
    readonly id: string;
    readonly name: string;
    readonly path: readonly string[];
    readonly xpath: string;
  }> = [];

  for (const node of nodes) {
    const currentPath = [...path, node.name];
    if (node.maxOccurs === "unbounded" || parseInt(node.maxOccurs, 10) > 1) {
      reps.push({
        id: node.id,
        name: node.name,
        path: currentPath,
        xpath: currentPath.join("/"),
      });
    }
    if (node.children.length > 0) {
      reps.push(...getRepeatingElements(node.children, currentPath));
    }
  }

  return reps;
}
