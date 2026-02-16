import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  memo,
  type KeyboardEvent,
} from "react";
import type { ConfigDiffResult, DiffChange } from "@engine/diff";
import { Button } from "@components/primitives";
import styles from "./DiffViewer.module.css";

// ─── Constants ──────────────────────────────────────────────────────────

const CHANGE_TYPE_ICONS: Record<DiffChange["changeType"], string> = {
  added: "+",
  removed: "\u2212",
  modified: "~",
};

const CHANGE_TYPE_ICON_CLASSES: Record<DiffChange["changeType"], string> = {
  added: styles["changeIconAdded"] ?? "",
  removed: styles["changeIconRemoved"] ?? "",
  modified: styles["changeIconModified"] ?? "",
};

const CHANGE_TYPE_ITEM_CLASSES: Record<DiffChange["changeType"], string> = {
  added: styles["changeItemAdded"] ?? "",
  removed: styles["changeItemRemoved"] ?? "",
  modified: styles["changeItemModified"] ?? "",
};

const CATEGORY_ORDER: readonly string[] = [
  "field",
  "column",
  "style",
  "metadata",
  "format",
  "sort",
  "group",
];

// ─── Props ──────────────────────────────────────────────────────────────

interface DiffViewerProps {
  diff: ConfigDiffResult;
  onAcceptChange: (changeId: string) => void;
  onAcceptAll: () => void;
  onDismiss: () => void;
}

// ─── Grouped changes ────────────────────────────────────────────────────

interface CategoryGroup {
  category: string;
  changes: readonly DiffChange[];
}

function groupChangesByCategory(
  changes: readonly DiffChange[],
): readonly CategoryGroup[] {
  const map = new Map<string, DiffChange[]>();

  for (const change of changes) {
    const existing = map.get(change.category);
    if (existing) {
      existing.push(change);
    } else {
      map.set(change.category, [change]);
    }
  }

  // Sort groups by the predefined category order
  return CATEGORY_ORDER.filter((cat) => map.has(cat)).map((cat) => ({
    category: cat,
    changes: map.get(cat)!,
  }));
}

// ─── Change Item ────────────────────────────────────────────────────────

interface ChangeItemProps {
  change: DiffChange;
  isFocused: boolean;
  onAccept: (changeId: string) => void;
}

const ChangeItem = memo(function ChangeItem({
  change,
  isFocused,
  onAccept,
}: ChangeItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused) {
      itemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isFocused]);

  const handleAccept = useCallback(() => {
    onAccept(change.id);
  }, [change.id, onAccept]);

  const iconClass = CHANGE_TYPE_ICON_CLASSES[change.changeType];
  const itemClass = CHANGE_TYPE_ITEM_CLASSES[change.changeType];
  const focusedClass = isFocused ? styles["changeItemFocused"] : "";

  return (
    <div
      ref={itemRef}
      className={`${styles["changeItem"]} ${itemClass} ${focusedClass}`}
      data-change-id={change.id}
    >
      <span
        className={iconClass}
        aria-label={change.changeType}
        role="img"
      >
        {CHANGE_TYPE_ICONS[change.changeType]}
      </span>

      <div className={styles["changeContent"]}>
        <span className={styles["changeLabel"]}>{change.label}</span>

        {(change.oldValue !== undefined || change.newValue !== undefined) && (
          <div className={styles["changeValues"]}>
            {change.oldValue !== undefined && (
              <span className={styles["oldValue"]}>{change.oldValue}</span>
            )}
            {change.oldValue !== undefined && change.newValue !== undefined && (
              <span className={styles["arrow"]} aria-hidden="true">
                &rarr;
              </span>
            )}
            {change.newValue !== undefined && (
              <span className={styles["newValue"]}>{change.newValue}</span>
            )}
          </div>
        )}
      </div>

      <button
        className={styles["acceptBtn"]}
        onClick={handleAccept}
        aria-label={`Accept change: ${change.label}`}
      >
        Accept
      </button>
    </div>
  );
});

// ─── Category Section ───────────────────────────────────────────────────

interface CategorySectionProps {
  group: CategoryGroup;
  focusedChangeId: string | null;
  onAccept: (changeId: string) => void;
}

const CategorySection = memo(function CategorySection({
  group,
  focusedChangeId,
  onAccept,
}: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    },
    [],
  );

  return (
    <div className={styles["categoryGroup"]} role="group" aria-label={`${group.category} changes`}>
      <button
        className={styles["categoryHeader"]}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
      >
        <span
          className={
            isOpen ? styles["categoryChevronOpen"] : styles["categoryChevron"]
          }
          aria-hidden="true"
        >
          &#9654;
        </span>
        <span className={styles["categoryLabel"]}>{group.category}</span>
        <span className={styles["categoryCount"]}>
          ({group.changes.length})
        </span>
      </button>

      {isOpen &&
        group.changes.map((change) => (
          <ChangeItem
            key={change.id}
            change={change}
            isFocused={focusedChangeId === change.id}
            onAccept={onAccept}
          />
        ))}
    </div>
  );
});

// ─── Main component ─────────────────────────────────────────────────────

export function DiffViewer({
  diff,
  onAcceptChange,
  onAcceptAll,
  onDismiss,
}: DiffViewerProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Flat list of all change IDs for keyboard navigation
  const allChanges = useMemo(() => diff.changes, [diff.changes]);

  const groups = useMemo(
    () => groupChangesByCategory(diff.changes),
    [diff.changes],
  );

  const focusedChangeId = useMemo(
    () => (focusedIndex >= 0 && focusedIndex < allChanges.length
      ? allChanges[focusedIndex]?.id ?? null
      : null),
    [allChanges, focusedIndex],
  );

  // ── Keyboard navigation ─────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < allChanges.length - 1 ? prev + 1 : prev,
          );
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        }
        case "Home": {
          e.preventDefault();
          setFocusedIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          setFocusedIndex(allChanges.length - 1);
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < allChanges.length) {
            const change = allChanges[focusedIndex];
            if (change) {
              onAcceptChange(change.id);
            }
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          onDismiss();
          break;
        }
      }
    },
    [allChanges, focusedIndex, onAcceptChange, onDismiss],
  );

  // ── Focus the viewer on mount for keyboard access ───────────────────

  useEffect(() => {
    viewerRef.current?.focus();
  }, []);

  // ── Identical configs → nothing to show ─────────────────────────────

  if (diff.isIdentical) {
    return (
      <div className={styles["viewer"]} aria-label="Configuration diff viewer">
        <header className={styles["header"]}>
          <h2 className={styles["title"]}>Configuration Diff</h2>
          <div className={styles["headerActions"]}>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </header>
        <div className={styles["empty"]}>
          Configurations are identical — no changes detected.
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  const { summary } = diff;

  return (
    <div
      ref={viewerRef}
      className={styles["viewer"]}
      role="region"
      aria-label="Configuration diff viewer"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <header className={styles["header"]}>
        <h2 className={styles["title"]}>Configuration Diff</h2>
        <div className={styles["headerActions"]}>
          <Button size="sm" variant="success" onClick={onAcceptAll}>
            Accept All
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </header>

      {/* Summary bar */}
      <div className={styles["summary"]} aria-live="polite">
        {summary.added > 0 && (
          <span className={styles["summaryAdded"]}>
            {summary.added} {summary.added === 1 ? "addition" : "additions"}
          </span>
        )}
        {summary.removed > 0 && (
          <span className={styles["summaryRemoved"]}>
            {summary.removed} {summary.removed === 1 ? "removal" : "removals"}
          </span>
        )}
        {summary.modified > 0 && (
          <span className={styles["summaryModified"]}>
            {summary.modified}{" "}
            {summary.modified === 1 ? "modification" : "modifications"}
          </span>
        )}
      </div>

      {/* Change list grouped by category */}
      <div
        className={styles["changeList"]}
        role="list"
        aria-label="List of configuration changes"
      >
        {groups.map((group) => (
          <CategorySection
            key={group.category}
            group={group}
            focusedChangeId={focusedChangeId}
            onAccept={onAcceptChange}
          />
        ))}
      </div>
    </div>
  );
}
