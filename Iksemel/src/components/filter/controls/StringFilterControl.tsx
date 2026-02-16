import { useCallback } from "react";
import type { FilterValue, FilterOperator } from "@/types";
import styles from "./StringFilterControl.module.css";

interface StringFilterControlProps {
  filter: FilterValue;
  onChange: (filter: FilterValue) => void;
}

const OPERATOR_LABELS: Readonly<Record<string, string>> = {
  EQUALS: "Equals",
  NOT_EQUALS: "Not equals",
  CONTAINS: "Contains",
  STARTS_WITH: "Starts with",
};

const STRING_OPERATORS: FilterOperator[] = ["EQUALS", "NOT_EQUALS", "CONTAINS", "STARTS_WITH"];

export function StringFilterControl({ filter, onChange }: StringFilterControlProps) {
  const handleOperatorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...filter, operator: e.target.value as FilterOperator });
    },
    [filter, onChange],
  );

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filter, values: [e.target.value] });
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
        {STRING_OPERATORS.map((op) => (
          <option key={op} value={op}>{OPERATOR_LABELS[op] ?? op}</option>
        ))}
      </select>
      <input
        type="text"
        className={styles["input"]}
        value={filter.values[0] ?? ""}
        placeholder="Enter value..."
        onChange={handleValueChange}
        aria-label="Filter value"
      />
    </div>
  );
}
