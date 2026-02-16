import { useEffect, useRef } from "react";
import styles from "./KeyboardShortcutOverlay.module.css";

interface KeyboardShortcutOverlayProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { section: "Selection" },
  { keys: "Ctrl+Z", description: "Undo selection change" },
  { keys: "Ctrl+Shift+Z", description: "Redo selection change" },
  { keys: "Space / Enter", description: "Toggle selected node" },
  { section: "Tree Navigation" },
  { keys: "\u2192", description: "Expand node" },
  { keys: "\u2190", description: "Collapse node" },
  { keys: "Tab / Shift+Tab", description: "Move between nodes" },
  { section: "Tabs" },
  { keys: "\u2190 / \u2192", description: "Switch tabs (when focused)" },
  { keys: "Home / End", description: "First / last tab" },
  { section: "General" },
  { keys: "Shift+?", description: "Toggle this overlay" },
  { keys: "Esc", description: "Close dialog / overlay" },
] as const;

export function KeyboardShortcutOverlay({ onClose }: KeyboardShortcutOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    overlayRef.current?.focus();
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className={styles["backdrop"]} onClick={onClose}>
      <div
        ref={overlayRef}
        className={styles["overlay"]}
        role="dialog"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles["header"]}>
          <h2 className={styles["title"]}>Keyboard Shortcuts</h2>
          <button className={styles["closeBtn"]} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className={styles["body"]}>
          {SHORTCUTS.map((item, i) => {
            if ("section" in item) {
              return (
                <div key={i} className={styles["section"]}>
                  {item.section}
                </div>
              );
            }
            return (
              <div key={i} className={styles["row"]}>
                <kbd className={styles["kbd"]}>{item.keys}</kbd>
                <span className={styles["desc"]}>{item.description}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
