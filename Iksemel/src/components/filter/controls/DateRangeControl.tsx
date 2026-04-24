import { useCallback } from "react";
import type { FilterValue, RestrictionFacets } from "@/types";
import styles from "./DateRangeControl.module.css";

interface DateRangeControlProps {
  filter: FilterValue;
  facets?: RestrictionFacets;
  onChange: (filter: FilterValue) => void;
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function startOfYear(): string {
  const d = new Date();
  d.setMonth(0, 1);
  return d.toISOString().slice(0, 10);
}

const DATE_PRESETS = [
  { label: "Today", getRange: (): [string, string] => { const d = isoDate(0); return [d, d]; } },
  { label: "This week", getRange: (): [string, string] => [startOfWeek(), isoDate(0)] },
  { label: "Last 30d", getRange: (): [string, string] => [isoDate(-30), isoDate(0)] },
  { label: "This month", getRange: (): [string, string] => [startOfMonth(), isoDate(0)] },
  { label: "This year", getRange: (): [string, string] => [startOfYear(), isoDate(0)] },
] as const;

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
    <div className={styles["wrapper"]}>
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
      <div className={styles["presets"]} role="group" aria-label="Date presets">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={styles["presetBtn"]}
            onClick={() => {
              const [start, end] = preset.getRange();
              onChange({ ...filter, rangeStart: start, rangeEnd: end });
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
