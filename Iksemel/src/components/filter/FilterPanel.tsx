/**
 * Filter panel — sits below the schema tree.
 *
 * Shows when a simple-type node is focused. Renders the node's
 * name, type, and documentation, plus the appropriate filter control
 * based on the field's XSD type, enumerations, and reference data.
 */

import { useCallback, useMemo } from "react";
import type {
  SchemaNode,
  FilterValue,
  FilterValuesState,
  ReferenceData,
  PolicyRule,
} from "@/types";
import { createDefaultFilter } from "@engine/filter/filter-helpers";
import { TypeBadge } from "@components/tree/TypeBadge";
import { Button } from "@components/primitives";
import { EnumFilterControl } from "./controls/EnumFilterControl";
import { DateRangeControl } from "./controls/DateRangeControl";
import { DurationRangeControl } from "./controls/DurationRangeControl";
import { NumberRangeControl } from "./controls/NumberRangeControl";
import { BooleanControl } from "./controls/BooleanControl";
import { StringFilterControl } from "./controls/StringFilterControl";
import styles from "./FilterPanel.module.css";

/** Date/time type names */
const DATE_TYPES = new Set(["date", "dateTime", "time", "gYear", "gYearMonth"]);

/** Numeric type names */
const NUMERIC_TYPES = new Set([
  "integer", "int", "long", "short", "byte", "decimal", "float", "double",
  "nonPositiveInteger", "negativeInteger", "nonNegativeInteger",
  "unsignedLong", "unsignedInt", "unsignedShort", "unsignedByte",
  "positiveInteger",
]);

interface FilterPanelProps {
  node: SchemaNode;
  filterValues: FilterValuesState;
  referenceData: ReferenceData | null;
  policy: readonly PolicyRule[];
  nodePath: readonly string[];
  onSetFilter: (nodeId: string, filter: FilterValue) => void;
  onRemoveFilter: (nodeId: string) => void;
  onClose: () => void;
}

export function FilterPanel({
  node,
  filterValues,
  referenceData,
  policy,
  nodePath,
  onSetFilter,
  onRemoveFilter,
  onClose,
}: FilterPanelProps) {
  const xpath = useMemo(
    () => [...nodePath, node.name].join("/"),
    [nodePath, node.name],
  );

  const currentFilter = filterValues[node.id] ?? null;

  const handleChange = useCallback(
    (filter: FilterValue) => {
      onSetFilter(node.id, filter);
    },
    [node.id, onSetFilter],
  );

  const handleApply = useCallback(() => {
    if (!currentFilter) {
      const defaultFilter = createDefaultFilter(node, referenceData, nodePath);
      onSetFilter(node.id, defaultFilter);
    }
  }, [node, referenceData, nodePath, currentFilter, onSetFilter]);

  const handleClear = useCallback(() => {
    onRemoveFilter(node.id);
  }, [node.id, onRemoveFilter]);

  // Determine if SINGLE_SELECT policy applies
  const isSingleSelect = policy.some(
    (r) => r.type === "SINGLE_SELECT" && r.xpath === xpath,
  );

  // Determine which control to render
  const hasEnums = (node.enumerations?.length ?? 0) > 0;
  const hasRefData = referenceData !== null && xpath in referenceData;
  const refEntry = hasRefData ? referenceData![xpath] : null;

  const filter = currentFilter ?? createDefaultFilter(node, referenceData, nodePath);

  return (
    <div className={styles["panel"]}>
      <div className={styles["header"]}>
        <div className={styles["nodeInfo"]}>
          <span className={styles["nodeName"]}>{node.name}</span>
          <TypeBadge typeName={node.typeName} />
        </div>
        <button
          type="button"
          className={styles["closeBtn"]}
          onClick={onClose}
          aria-label="Close filter panel"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {node.documentation && (
        <p className={styles["docs"]}>{node.documentation}</p>
      )}

      <div className={styles["control"]}>
        {hasEnums || hasRefData ? (
          <EnumFilterControl
            filter={filter}
            options={hasRefData ? (refEntry?.values ?? []) : (node.enumerations ?? [])}
            labels={hasRefData ? refEntry?.labels : undefined}
            singleSelect={isSingleSelect}
            onChange={handleChange}
          />
        ) : node.typeName === "boolean" ? (
          <BooleanControl filter={filter} onChange={handleChange} />
        ) : DATE_TYPES.has(node.typeName) ? (
          <DateRangeControl filter={filter} facets={node.facets} onChange={handleChange} />
        ) : node.typeName === "duration" ? (
          <DurationRangeControl filter={filter} onChange={handleChange} />
        ) : NUMERIC_TYPES.has(node.typeName) ? (
          <NumberRangeControl filter={filter} facets={node.facets} onChange={handleChange} />
        ) : (
          <StringFilterControl filter={filter} onChange={handleChange} />
        )}
      </div>

      <div className={styles["actions"]}>
        <Button size="sm" variant="primary" onClick={handleApply}>
          Apply
        </Button>
        <Button size="sm" variant="ghost" onClick={handleClear} disabled={!currentFilter}>
          Clear
        </Button>
      </div>
    </div>
  );
}
