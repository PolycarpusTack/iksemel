import type { FilterValuesState, FilterValue, SchemaNode } from "@/types";
import { Button } from "@components/primitives";
import styles from "./FilterSummaryTab.module.css";

interface FilterSummaryTabProps {
  filterValues: FilterValuesState;
  schema: readonly SchemaNode[] | null;
  onRemoveFilter: (nodeId: string) => void;
  onClearAll: () => void;
  onFocusNode: (nodeId: string) => void;
}

function formatFilterSummary(filter: FilterValue): string {
  switch (filter.operator) {
    case "IN":
      return `IN (${filter.values.join(", ")})`;
    case "NOT_IN":
      return `NOT IN (${filter.values.join(", ")})`;
    case "BETWEEN":
      return `BETWEEN ${filter.rangeStart ?? "?"} and ${filter.rangeEnd ?? "?"}`;
    case "EQUALS":
      return `= ${filter.values[0] ?? ""}`;
    case "NOT_EQUALS":
      return `≠ ${filter.values[0] ?? ""}`;
    case "CONTAINS":
      return `contains "${filter.values[0] ?? ""}"`;
    case "STARTS_WITH":
      return `starts with "${filter.values[0] ?? ""}"`;
    case "GREATER_THAN":
      return `> ${filter.values[0] ?? ""}`;
    case "LESS_THAN":
      return `< ${filter.values[0] ?? ""}`;
    case "IS_TRUE":
      return "is true";
    case "IS_FALSE":
      return "is false";
  }
}

function findNodeName(nodeId: string, nodes: readonly SchemaNode[]): string | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node.name;
    if (node.children.length > 0) {
      const found = findNodeName(nodeId, node.children);
      if (found) return found;
    }
  }
  return null;
}

export function FilterSummaryTab({
  filterValues,
  schema,
  onRemoveFilter,
  onClearAll,
  onFocusNode,
}: FilterSummaryTabProps) {
  const filters = Object.values(filterValues);

  if (filters.length === 0) {
    return (
      <div className={styles["empty"]}>
        No active filters. Select a field in the tree and configure a filter to add one.
      </div>
    );
  }

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <span className={styles["count"]}>
          {filters.length} active {filters.length === 1 ? "filter" : "filters"}
        </span>
        <Button size="sm" variant="ghost" onClick={onClearAll} aria-label="Clear all filters">
          Clear All
        </Button>
      </div>
      <ul className={styles["list"]} role="list" aria-label="Active filters">
        {filters.map((f) => {
          const nodeName = schema ? (findNodeName(f.nodeId, schema) ?? f.xpath) : f.xpath;
          return (
            <li key={f.nodeId} className={styles["row"]}>
              <button
                className={styles["rowBody"]}
                onClick={() => onFocusNode(f.nodeId)}
                aria-label={`Edit filter for ${nodeName}`}
              >
                <span className={styles["fieldName"]}>{nodeName}</span>
                <span className={styles["summary"]}>{formatFilterSummary(f)}</span>
              </button>
              <button
                className={styles["removeBtn"]}
                onClick={() => onRemoveFilter(f.nodeId)}
                aria-label={`Remove filter for ${nodeName}`}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
