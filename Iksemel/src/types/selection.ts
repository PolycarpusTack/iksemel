/**
 * Maps node IDs to their selection state.
 * A node is selected if its ID is present and true.
 */
export type SelectionState = Readonly<Record<string, boolean | undefined>>;

/**
 * Tri-state checkbox value for tree nodes.
 * - checked: node and all descendants are selected
 * - partial: some (but not all) descendants are selected
 * - unchecked: node and all descendants are unselected
 */
export type CheckState = "checked" | "partial" | "unchecked";

/**
 * Represents an action that can be applied to selection state.
 * Used by the selection reducer for undo/redo support.
 */
export type SelectionAction =
  | { readonly type: "TOGGLE_NODE"; readonly nodeId: string }
  | { readonly type: "SELECT_ALL" }
  | { readonly type: "CLEAR_ALL" }
  | { readonly type: "RESTORE"; readonly state: SelectionState }
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" };

/**
 * Maps node IDs to their expansion state in the tree UI.
 */
export type ExpansionState = Readonly<Record<string, boolean>>;

/**
 * Represents a leaf node that has been selected,
 * including its full path and XPath for column generation.
 */
export interface SelectedLeaf {
  readonly id: string;
  readonly name: string;
  readonly path: readonly string[];
  readonly xpath: string;
  readonly typeName: string;
}

/**
 * Represents a repeating element in the schema tree,
 * used for row source detection and payload warnings.
 */
export interface RepeatingElement {
  readonly id: string;
  readonly name: string;
  readonly path: readonly string[];
  readonly xpath: string;
}
