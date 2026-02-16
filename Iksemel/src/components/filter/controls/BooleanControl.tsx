import { useCallback } from "react";
import type { FilterValue, FilterOperator } from "@/types";
import styles from "./BooleanControl.module.css";

interface BooleanControlProps {
  filter: FilterValue;
  onChange: (filter: FilterValue) => void;
}

export function BooleanControl({ filter, onChange }: BooleanControlProps) {
  const handleSelect = useCallback(
    (operator: FilterOperator) => {
      onChange({ ...filter, operator, values: [] });
    },
    [filter, onChange],
  );

  return (
    <div className={styles["container"]} role="radiogroup" aria-label="Boolean filter">
      <button
        type="button"
        role="radio"
        aria-checked={filter.operator === "IS_TRUE"}
        className={`${styles["option"]} ${filter.operator === "IS_TRUE" ? styles["optionSelected"] : ""}`}
        onClick={() => handleSelect("IS_TRUE")}
      >
        True
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={filter.operator === "IS_FALSE"}
        className={`${styles["option"]} ${filter.operator === "IS_FALSE" ? styles["optionSelected"] : ""}`}
        onClick={() => handleSelect("IS_FALSE")}
      >
        False
      </button>
    </div>
  );
}
