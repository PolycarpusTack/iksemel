import { useCallback } from "react";
import type { FilterValue, FilterOperator, RestrictionFacets } from "@/types";
import { getOperatorsForType } from "@engine/filter/operators";
import styles from "./NumberRangeControl.module.css";

interface NumberRangeControlProps {
  filter: FilterValue;
  facets?: RestrictionFacets;
  onChange: (filter: FilterValue) => void;
}

const OPERATOR_LABELS: Readonly<Record<string, string>> = {
  BETWEEN: "Between",
  EQUALS: "Equals",
  NOT_EQUALS: "Not equals",
  GREATER_THAN: "Greater than",
  LESS_THAN: "Less than",
};

export function NumberRangeControl({ filter, facets, onChange }: NumberRangeControlProps) {
  const operators = getOperatorsForType(filter.typeName, false, false);
  const minVal = facets?.minInclusive ?? facets?.minExclusive;
  const maxVal = facets?.maxInclusive ?? facets?.maxExclusive;

  const handleOperatorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...filter, operator: e.target.value as FilterOperator, values: [], rangeStart: undefined, rangeEnd: undefined });
    },
    [filter, onChange],
  );

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filter, values: [e.target.value] });
    },
    [filter, onChange],
  );

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filter, rangeStart: e.target.value });
    },
    [filter, onChange],
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filter, rangeEnd: e.target.value });
    },
    [filter, onChange],
  );

  return (
    <div className={styles["container"]}>
      <select
        className={styles["operator"]}
        value={filter.operator}
        onChange={handleOperatorChange}
        aria-label="Filter operator"
      >
        {operators.map((op) => (
          <option key={op} value={op}>{OPERATOR_LABELS[op] ?? op}</option>
        ))}
      </select>

      {filter.operator === "BETWEEN" ? (
        <div className={styles["range"]}>
          <input
            type="number"
            className={styles["input"]}
            value={filter.rangeStart ?? ""}
            placeholder="Min"
            min={minVal}
            max={maxVal}
            onChange={handleStartChange}
            aria-label="Minimum value"
          />
          <span className={styles["separator"]}>to</span>
          <input
            type="number"
            className={styles["input"]}
            value={filter.rangeEnd ?? ""}
            placeholder="Max"
            min={minVal}
            max={maxVal}
            onChange={handleEndChange}
            aria-label="Maximum value"
          />
        </div>
      ) : (
        <input
          type="number"
          className={styles["input"]}
          value={filter.values[0] ?? ""}
          min={minVal}
          max={maxVal}
          onChange={handleValueChange}
          aria-label="Filter value"
        />
      )}
    </div>
  );
}
