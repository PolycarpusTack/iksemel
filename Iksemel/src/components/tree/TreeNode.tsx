import { memo, useCallback } from "react";
import type { SchemaNode, SelectionState, ExpansionState } from "@/types";
import { getCheckState } from "@engine/selection";
import { Checkbox } from "@components/primitives";
import { TypeBadge } from "./TypeBadge";
import { useTooltip } from "./useTooltip";
import styles from "./TreeNode.module.css";

interface TreeNodeProps {
  node: SchemaNode;
  level: number;
  selection: SelectionState;
  expansion: ExpansionState;
  schema: readonly SchemaNode[];
  onToggleSelect: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
  /** Called when a simple-type node's name/type area is clicked for filtering. */
  onFocusNode?: (nodeId: string) => void;
  /** ID of the currently focused node (for highlight styling). */
  focusedNodeId?: string | null;
  /** Whether this node has an active filter. */
  hasFilter?: boolean;
  /** When true, children are rendered by a parent virtualiser — skip recursive rendering. */
  flat?: boolean;
}

/** Format minOccurs/maxOccurs into a human-readable cardinality string. */
function formatCardinality(min: string, max: string): string {
  const lo = min === "" ? "1" : min;
  const hi = max === "unbounded" ? "\u221E" : max === "" ? "1" : max;
  return `${lo}..${hi}`;
}

/** Counts total leaf nodes under a branch (including nested). */
function countLeaves(node: SchemaNode): number {
  if (node.children.length === 0) return 1;
  let n = 0;
  for (const child of node.children) n += countLeaves(child);
  return n;
}

/** Counts selected leaf nodes under a branch. */
function countSelectedLeaves(node: SchemaNode, sel: SelectionState): number {
  if (node.children.length === 0) return sel[node.id] ? 1 : 0;
  let n = 0;
  for (const child of node.children) n += countSelectedLeaves(child, sel);
  return n;
}

/**
 * A single node row in the schema tree.
 *
 * Renders chevron toggle, tri-state checkbox, name, type badge,
 * cardinality indicator, required marker, and documentation tooltip.
 */
export const TreeNode = memo(
  function TreeNode({
    node, level, selection, expansion, schema, onToggleSelect, onToggleExpand, onFocusNode, focusedNodeId, hasFilter, flat,
  }: TreeNodeProps) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expansion[node.id] === true;
    const checkState = getCheckState(node, selection);
    const { tooltip, onMouseEnter, onMouseLeave } = useTooltip(!!node.documentation);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case "Enter":
          case " ":
            e.preventDefault();
            onToggleSelect(node.id);
            break;
          case "ArrowRight":
            if (hasChildren && !isExpanded) { e.preventDefault(); onToggleExpand(node.id); }
            break;
          case "ArrowLeft":
            if (hasChildren && isExpanded) { e.preventDefault(); onToggleExpand(node.id); }
            break;
        }
      },
      [node.id, hasChildren, isExpanded, onToggleSelect, onToggleExpand],
    );

    const handleRowClick = useCallback(() => {
      // If this is a selected simple-type node and onFocusNode is provided,
      // clicking the row focuses it for filtering instead of toggling selection.
      if (onFocusNode && node.type === "simple" && selection[node.id]) {
        onFocusNode(node.id);
      } else {
        onToggleSelect(node.id);
      }
    }, [node.id, node.type, selection, onToggleSelect, onFocusNode]);
    const handleChevronClick = useCallback(
      (e: React.MouseEvent) => { e.stopPropagation(); onToggleExpand(node.id); },
      [node.id, onToggleExpand],
    );

    const chevronClass = [
      styles["chevron"],
      hasChildren ? "" : styles["chevronHidden"],
      isExpanded ? styles["chevronExpanded"] : "",
    ].filter(Boolean).join(" ");

    const nameClass = [
      styles["name"],
      node.isAttribute ? styles["nameAttribute"] : "",
    ].filter(Boolean).join(" ");

    const indentPx = level * 16; /* matches var(--space-8) = 16px */
    const isFocused = focusedNodeId === node.id;
    const rowClass = [
      styles["row"],
      isFocused ? styles["rowFocused"] : "",
    ].filter(Boolean).join(" ");

    return (
      <>
        <div
          className={rowClass}
          role="treeitem"
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-selected={checkState === "checked"}
          aria-level={level + 1}
          tabIndex={0}
          style={{ paddingLeft: `${indentPx}px` }}
          onClick={handleRowClick}
          onKeyDown={handleKeyDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <span className={chevronClass} onClick={handleChevronClick} aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M3 1L7 5L3 9" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </span>

          <Checkbox
            state={checkState}
            onChange={() => onToggleSelect(node.id)}
            label={`Select ${node.name}`}
          />

          <span className={nameClass}>
            {node.isAttribute ? `@${node.name}` : node.name}
          </span>

          <TypeBadge typeName={node.typeName} />

          {hasFilter && (
            <span className={styles["filterIcon"]} title="Filter active" aria-label="Filter active">
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1 1.5H9L6 5V8.5L4 7.5V5L1 1.5Z" stroke="currentColor"
                  strokeWidth="1" fill="currentColor" fillOpacity="0.3" strokeLinejoin="round" />
              </svg>
            </span>
          )}

          <span className={styles["cardinality"]}>
            {formatCardinality(node.minOccurs, node.maxOccurs)}
          </span>

          {hasChildren && !isExpanded && (
            <span className={styles["childCount"]} aria-label={`${countSelectedLeaves(node, selection)} of ${countLeaves(node)} fields selected`}>
              {countSelectedLeaves(node, selection)}/{countLeaves(node)}
            </span>
          )}

          {node.isRequired && (
            <span className={styles["required"]} title="Required field">*</span>
          )}
        </div>

        {tooltip.visible && node.documentation && (
          <div
            className={styles["tooltip"]}
            role="tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {node.documentation}
          </div>
        )}

        {!flat && hasChildren && isExpanded && node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            level={level + 1}
            selection={selection}
            expansion={expansion}
            schema={schema}
            onToggleSelect={onToggleSelect}
            onToggleExpand={onToggleExpand}
            onFocusNode={onFocusNode}
            focusedNodeId={focusedNodeId}
          />
        ))}
      </>
    );
  },
  (prev, next) =>
    prev.node === next.node &&
    prev.level === next.level &&
    prev.selection === next.selection &&
    prev.expansion === next.expansion &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.onToggleExpand === next.onToggleExpand &&
    prev.onFocusNode === next.onFocusNode &&
    prev.focusedNodeId === next.focusedNodeId &&
    prev.hasFilter === next.hasFilter &&
    prev.flat === next.flat,
);
