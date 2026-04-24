import { useEffect, useRef, useCallback } from "react";
import type { SchemaNode } from "@/types";
import styles from "./ContextMenu.module.css";

interface ContextMenuProps {
  x: number;
  y: number;
  node: SchemaNode;
  onClose: () => void;
  onSelectSubtree: (nodeId: string) => void;
  onDeselectSubtree: (nodeId: string) => void;
  onExpandSubtree: (nodeId: string) => void;
  onCollapseSubtree: (nodeId: string) => void;
  onCopyXPath: (node: SchemaNode) => void;
  onCopyName: (node: SchemaNode) => void;
  onCopyDocumentation: (node: SchemaNode) => void;
  onFocusForFilter: (nodeId: string) => void;
  onSelectByType: (typeName: string) => void;
  onAddToColumns: (nodeId: string) => void;
}

export function ContextMenu({
  x,
  y,
  node,
  onClose,
  onSelectSubtree,
  onDeselectSubtree,
  onExpandSubtree,
  onCollapseSubtree,
  onCopyXPath,
  onCopyName,
  onCopyDocumentation,
  onFocusForFilter,
  onSelectByType,
  onAddToColumns,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLUListElement>(null);
  const isSimple = node.type === "simple" || node.children.length === 0;

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    // Focus first item
    const first = el.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(el.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
        const focused = document.activeElement as HTMLElement;
        const idx = items.indexOf(focused);
        const next = e.key === "ArrowDown"
          ? (idx + 1) % items.length
          : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Slight delay so the triggering right-click doesn't immediately close
    const id = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Viewport-aware positioning
  const menuWidth = 220;
  const menuHeight = 280;
  const safeX = typeof window !== "undefined" ? Math.min(x, window.innerWidth - menuWidth - 8) : x;
  const safeY = typeof window !== "undefined" ? Math.min(y, window.innerHeight - menuHeight - 8) : y;

  const item = useCallback((
    label: string,
    action: () => void,
    disabled = false,
  ) => (
    <li role="none">
      <button
        role="menuitem"
        className={styles["item"]}
        onClick={() => { action(); onClose(); }}
        disabled={disabled}
        tabIndex={-1}
      >
        {label}
      </button>
    </li>
  ), [onClose]);

  const divider = <li role="none" className={styles["divider"]} aria-hidden="true" />;

  return (
    <ul
      ref={menuRef}
      role="menu"
      className={styles["menu"]}
      style={{ left: safeX, top: safeY }}
      aria-label={`Actions for ${node.name}`}
    >
      {item("Select subtree", () => onSelectSubtree(node.id))}
      {item("Deselect subtree", () => onDeselectSubtree(node.id))}
      {item("Expand subtree", () => onExpandSubtree(node.id), !node.children.length)}
      {item("Collapse subtree", () => onCollapseSubtree(node.id), !node.children.length)}
      {divider}
      {item("Copy XPath", () => onCopyXPath(node))}
      {item("Copy name", () => onCopyName(node))}
      {item("Copy documentation", () => onCopyDocumentation(node), !node.documentation)}
      {divider}
      {item("Focus for filtering", () => onFocusForFilter(node.id), !isSimple)}
      {item(`Select all ${node.typeName || "string"} fields`, () => onSelectByType(node.typeName || "string"), !isSimple && !node.typeName)}
      {item("Add to columns", () => onAddToColumns(node.id), !isSimple)}
    </ul>
  );
}
