import { useRef, useMemo, useCallback, useState } from "react";
import type { SchemaNode, SelectionState, ExpansionState } from "@/types";
import { TreeNode } from "./TreeNode";
import { ContextMenu } from "./ContextMenu";
import { buildTreeSearchIndex, flattenTree } from "./flattenTree";
import { useVirtualTree } from "./useVirtualTree";
import styles from "./SchemaTree.module.css";

/** Row height in pixels — must match the CSS min-height of a tree row. */
const ROW_HEIGHT = 32;

function buildNodeXPath(targetId: string, nodes: readonly SchemaNode[], path: string[] = []): string | null {
  for (const node of nodes) {
    const current = [...path, node.name];
    if (node.id === targetId) return current.join("/");
    if (node.children.length > 0) {
      const found = buildNodeXPath(targetId, node.children, current);
      if (found) return found;
    }
  }
  return null;
}

/**
 * A frozen empty expansion state shared by all collapsed nodes.
 * Avoids allocating a new object per collapsed node and provides
 * a stable reference for TreeNode's memo comparison.
 */
const EMPTY_EXPANSION: ExpansionState = Object.freeze({});

interface SchemaTreeProps {
  schema: readonly SchemaNode[];
  selection: SelectionState;
  expansion: ExpansionState;
  searchQuery: string;
  onToggleSelect: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
  onFocusNode?: (nodeId: string) => void;
  focusedNodeId?: string | null;
  /** Set of node IDs that have active filters. */
  filteredNodeIds?: ReadonlySet<string>;
  /** Optional type filter (e.g. "string", "dateTime"). */
  typeFilter?: string | null;
  /** Called with ordered list of node IDs when a shift+click range is selected. */
  onRangeSelect?: (nodeIds: readonly string[]) => void;
  onSelectSubtree?: (nodeId: string) => void;
  onDeselectSubtree?: (nodeId: string) => void;
  onExpandSubtree?: (nodeId: string) => void;
  onCollapseSubtree?: (nodeId: string) => void;
  onSelectByType?: (typeName: string) => void;
  onAddToColumns?: (nodeId: string) => void;
}

/**
 * Container component that renders the schema tree with virtual scrolling.
 *
 * Flattens the tree into a list based on expansion state and search filter,
 * then renders only the visible subset using a virtualisation hook.
 * TreeNode components are unaware of virtualisation — each receives a
 * per-node expansion state so it shows the correct chevron orientation and
 * keyboard behaviour. Any recursively rendered children are clipped by a
 * fixed-height wrapper div with overflow:hidden.
 */
export function SchemaTree({
  schema,
  selection,
  expansion,
  searchQuery,
  onToggleSelect,
  onToggleExpand,
  onFocusNode,
  focusedNodeId,
  filteredNodeIds,
  typeFilter,
  onRangeSelect,
  onSelectSubtree,
  onDeselectSubtree,
  onExpandSubtree,
  onCollapseSubtree,
  onSelectByType,
  onAddToColumns,
}: SchemaTreeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastClickedIndexRef = useRef<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: SchemaNode } | null>(null);

  /** Flatten tree into a display-ordered list of visible nodes. */
  const searchIndex = useMemo(() => buildTreeSearchIndex(schema), [schema]);

  /** Flatten tree into a display-ordered list of visible nodes. */
  const flatNodes = useMemo(
    () => flattenTree(schema, expansion, searchQuery, typeFilter, searchIndex),
    [schema, expansion, searchQuery, typeFilter, searchIndex],
  );

  /**
   * Cache of per-node expansion state objects, keyed by node ID.
   * Each expanded node gets an object like `{ [nodeId]: true }` which is
   * reused across scroll events (stable reference for TreeNode memo).
   * Rebuilt only when the expansion state changes.
   */
  const expansionCache = useMemo(() => {
    const cache = new Map<string, ExpansionState>();
    for (const flatNode of flatNodes) {
      if (flatNode.isExpanded) {
        cache.set(flatNode.node.id, { [flatNode.node.id]: true });
      }
    }
    return cache;
  }, [flatNodes]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const idx = flatNodes.findIndex((n) => n.node.id === nodeId);
    if (idx !== -1) lastClickedIndexRef.current = idx;
    onToggleSelect(nodeId);
  }, [flatNodes, onToggleSelect]);

  const handleShiftClick = useCallback((nodeId: string) => {
    if (!onRangeSelect) return;
    const currentIndex = flatNodes.findIndex((n) => n.node.id === nodeId);
    if (currentIndex === -1) return;
    const from = lastClickedIndexRef.current ?? currentIndex;
    const start = Math.min(from, currentIndex);
    const end = Math.max(from, currentIndex);
    const rangeIds = flatNodes.slice(start, end + 1).map((n) => n.node.id);
    lastClickedIndexRef.current = currentIndex;
    onRangeSelect(rangeIds);
  }, [flatNodes, onRangeSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: SchemaNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleCopyXPath = useCallback((node: SchemaNode) => {
    const xpath = buildNodeXPath(node.id, schema) ?? node.name;
    void navigator.clipboard.writeText(xpath);
  }, [schema]);

  const handleCopyName = useCallback((node: SchemaNode) => {
    void navigator.clipboard.writeText(node.name);
  }, []);

  const handleCopyDocumentation = useCallback((node: SchemaNode) => {
    void navigator.clipboard.writeText(node.documentation ?? "");
  }, []);

  /** Virtualise: only render nodes within (and near) the viewport. */
  const { visibleNodes, totalHeight, offsetY, onScroll } = useVirtualTree({
    flatNodes,
    rowHeight: ROW_HEIGHT,
    containerRef,
    overscan: 20,
  });

  if (flatNodes.length === 0) {
    return (
      <div className={styles["container"]} role="tree" aria-label="Schema tree">
        <div className={styles["empty"]}>
          {searchQuery.trim()
            ? "No fields match your search."
            : "No schema loaded."}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles["container"]}
      role="tree"
      aria-label="Schema tree"
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleNodes.map((flatNode) => (
            <div
              key={flatNode.node.id}
              style={{ height: ROW_HEIGHT, overflow: "hidden" }}
            >
              <TreeNode
                node={flatNode.node}
                level={flatNode.depth}
                selection={selection}
                expansion={expansionCache.get(flatNode.node.id) ?? EMPTY_EXPANSION}
                schema={schema}
                onToggleSelect={handleNodeClick}
                onToggleExpand={onToggleExpand}
                onFocusNode={onFocusNode}
                focusedNodeId={focusedNodeId}
                hasFilter={filteredNodeIds?.has(flatNode.node.id)}
                onShiftClick={onRangeSelect ? handleShiftClick : undefined}
                onContextMenu={handleContextMenu}
                flat
              />
            </div>
          ))}
        </div>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onSelectSubtree={(id) => { onSelectSubtree?.(id); }}
          onDeselectSubtree={(id) => { onDeselectSubtree?.(id); }}
          onExpandSubtree={(id) => { onExpandSubtree?.(id); }}
          onCollapseSubtree={(id) => { onCollapseSubtree?.(id); }}
          onCopyXPath={handleCopyXPath}
          onCopyName={handleCopyName}
          onCopyDocumentation={handleCopyDocumentation}
          onFocusForFilter={(id) => { onFocusNode?.(id); }}
          onSelectByType={(typeName) => { onSelectByType?.(typeName); }}
          onAddToColumns={(id) => { onAddToColumns?.(id); }}
        />
      )}
    </div>
  );
}
