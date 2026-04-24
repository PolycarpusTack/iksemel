import { useCallback } from "react";
import { Button, Input } from "@components/primitives";
import styles from "./TreeToolbar.module.css";

const TYPE_FILTERS = ["string", "dateTime", "integer", "boolean", "duration", "date", "decimal"] as const;

interface TreeToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  typeFilter: string | null;
  onTypeFilterChange: (type: string | null) => void;
  searchMatchCount?: number | null;
  onSelectSearchResults?: () => void;
}

/**
 * Toolbar with tree-wide actions and a search input.
 */
export function TreeToolbar({
  searchQuery,
  onSearchChange,
  onExpandAll,
  onCollapseAll,
  onSelectAll,
  onClearAll,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  typeFilter,
  onTypeFilterChange,
  searchMatchCount,
  onSelectSearchResults,
}: TreeToolbarProps) {
  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange],
  );

  return (
    <div className={styles["toolbar"]} role="toolbar" aria-label="Schema tree actions">
      {/* Expand / Collapse */}
      <div className={styles["actions"]}>
        <Button size="sm" variant="ghost" onClick={onExpandAll} aria-label="Expand all nodes">
          Expand All
        </Button>
        <Button size="sm" variant="ghost" onClick={onCollapseAll} aria-label="Collapse all nodes">
          Collapse All
        </Button>
      </div>

      <div className={styles["separator"]} aria-hidden="true" />

      {/* Select / Clear */}
      <div className={styles["actions"]}>
        <Button size="sm" variant="ghost" onClick={onSelectAll} aria-label="Select all fields">
          Select All
        </Button>
        <Button size="sm" variant="ghost" onClick={onClearAll} aria-label="Clear selection">
          Clear
        </Button>
      </div>

      <div className={styles["separator"]} aria-hidden="true" />

      {/* Undo / Redo */}
      <div className={styles["actions"]}>
        <Button size="sm" variant="ghost" onClick={onUndo} disabled={!canUndo} aria-label="Undo selection (Ctrl+Z)">
          Undo
        </Button>
        <Button size="sm" variant="ghost" onClick={onRedo} disabled={!canRedo} aria-label="Redo selection (Ctrl+Shift+Z)">
          Redo
        </Button>
      </div>

      <div className={styles["separator"]} aria-hidden="true" />

      {/* Search */}
      <div className={styles["searchWrapper"]}>
        <Input
          compact
          type="search"
          placeholder="Search fields..."
          value={searchQuery}
          onChange={handleSearchInput}
          aria-label="Search schema fields"
        />
        {searchMatchCount !== null && searchMatchCount !== undefined && (
          <span className={styles["matchCount"]} aria-live="polite">
            {searchMatchCount} {searchMatchCount === 1 ? "match" : "matches"}
          </span>
        )}
        {searchMatchCount != null && searchMatchCount > 0 && onSelectSearchResults && (
          <Button size="sm" variant="ghost" onClick={onSelectSearchResults} aria-label={`Select ${searchMatchCount} matching fields`}>
            Select {searchMatchCount}
          </Button>
        )}
      </div>

      {/* Type filter chips */}
      <div className={styles["typeChips"]} role="group" aria-label="Filter by type">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            className={`${styles["typeChip"]} ${typeFilter === t ? styles["typeChipActive"] ?? "" : ""}`}
            onClick={() => onTypeFilterChange(typeFilter === t ? null : t)}
            aria-pressed={typeFilter === t}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
