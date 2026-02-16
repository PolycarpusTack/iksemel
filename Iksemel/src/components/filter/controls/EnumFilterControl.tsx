import { useState, useCallback } from "react";
import type { FilterValue } from "@/types";
import styles from "./EnumFilterControl.module.css";

interface EnumFilterControlProps {
  filter: FilterValue;
  options: readonly string[];
  labels?: readonly string[];
  singleSelect?: boolean;
  onChange: (filter: FilterValue) => void;
}

export function EnumFilterControl({
  filter,
  options,
  labels,
  singleSelect,
  onChange,
}: EnumFilterControlProps) {
  const [search, setSearch] = useState("");

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggle = useCallback(
    (value: string) => {
      let newValues: string[];
      if (singleSelect) {
        newValues = filter.values.includes(value) ? [] : [value];
      } else {
        newValues = filter.values.includes(value)
          ? filter.values.filter((v) => v !== value)
          : [...filter.values, value];
      }
      onChange({ ...filter, values: newValues });
    },
    [filter, singleSelect, onChange],
  );

  return (
    <div className={styles["container"]}>
      <input
        type="text"
        className={styles["search"]}
        placeholder="Search values..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search filter values"
      />
      <div className={styles["chipList"]} role="listbox" aria-label="Filter values">
        {filtered.map((opt) => {
          const label = labels?.[options.indexOf(opt)] ?? opt;
          const isSelected = filter.values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={`${styles["chip"]} ${isSelected ? styles["chipSelected"] : ""}`}
              onClick={() => handleToggle(opt)}
            >
              {label}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <span className={styles["empty"]}>No matching values</span>
        )}
      </div>
    </div>
  );
}
