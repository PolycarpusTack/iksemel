import { useCallback } from "react";
import type { FilterValue } from "@/types";
import styles from "./DurationRangeControl.module.css";

interface DurationRangeControlProps {
  filter: FilterValue;
  onChange: (filter: FilterValue) => void;
}

export function DurationRangeControl({ filter, onChange }: DurationRangeControlProps) {
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
        <span className={styles["label"]}>Min duration</span>
        <input
          type="text"
          className={styles["input"]}
          value={filter.rangeStart ?? ""}
          placeholder="HH:MM:SS"
          onChange={handleStartChange}
          aria-label="Minimum duration"
        />
      </label>
      <label className={styles["field"]}>
        <span className={styles["label"]}>Max duration</span>
        <input
          type="text"
          className={styles["input"]}
          value={filter.rangeEnd ?? ""}
          placeholder="HH:MM:SS"
          onChange={handleEndChange}
          aria-label="Maximum duration"
        />
      </label>
    </div>
  );
}
