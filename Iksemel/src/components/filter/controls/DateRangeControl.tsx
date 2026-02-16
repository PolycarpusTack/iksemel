import { useCallback } from "react";
import type { FilterValue, RestrictionFacets } from "@/types";
import styles from "./DateRangeControl.module.css";

interface DateRangeControlProps {
  filter: FilterValue;
  facets?: RestrictionFacets;
  onChange: (filter: FilterValue) => void;
}

export function DateRangeControl({ filter, facets, onChange }: DateRangeControlProps) {
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
      <label className={styles["field"]}>
        <span className={styles["label"]}>From</span>
        <input
          type="date"
          className={styles["input"]}
          value={filter.rangeStart ?? ""}
          min={facets?.minInclusive}
          max={facets?.maxInclusive}
          onChange={handleStartChange}
          aria-label="Start date"
        />
      </label>
      <label className={styles["field"]}>
        <span className={styles["label"]}>To</span>
        <input
          type="date"
          className={styles["input"]}
          value={filter.rangeEnd ?? ""}
          min={facets?.minInclusive}
          max={facets?.maxInclusive}
          onChange={handleEndChange}
          aria-label="End date"
        />
      </label>
    </div>
  );
}
