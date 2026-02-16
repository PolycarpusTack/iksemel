import { formatBytes } from "@engine/analysis";
import type { ValidationWarning } from "@engine/analysis";
import styles from "./MetricsBar.module.css";

interface PayloadExplosion {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly contributionPct: number;
}

interface MetricsBarProps {
  selectedCount: number;
  totalCount: number;
  reductionPct: number;
  filterCount?: number;
  rawXmlSize: number;
  reportSize: number;
  payloadExplosions?: readonly PayloadExplosion[];
  validationWarnings?: readonly ValidationWarning[];
  dataEstimate?: { estimatedKb: number; source: "data" | "static" } | null;
}

/** Return the colour tier class based on reduction percentage. */
function reductionColourClass(pct: number): string {
  if (pct >= 70) return styles["reductionGreen"] ?? "";
  if (pct >= 40) return styles["reductionYellow"] ?? "";
  return styles["reductionRed"] ?? "";
}

function gaugeColourClass(pct: number): string {
  if (pct >= 70) return styles["gaugeFillGreen"] ?? "";
  if (pct >= 40) return styles["gaugeFillYellow"] ?? "";
  return styles["gaugeFillRed"] ?? "";
}

/**
 * Displays field selection metrics: count, reduction percentage,
 * and a visual gauge bar. Includes an ARIA live region for
 * announcing changes to assistive technology.
 */
export function MetricsBar({
  selectedCount,
  totalCount,
  reductionPct,
  filterCount = 0,
  rawXmlSize,
  reportSize,
  payloadExplosions = [],
  validationWarnings = [],
  dataEstimate,
}: MetricsBarProps) {
  const clampedPct = Math.max(0, Math.min(100, reductionPct));
  /* Gauge width = proportion of fields *not* selected (reduction). */
  const gaugeWidth = `${clampedPct}%`;

  return (
    <div className={styles["bar"]}>
      {/* Field count */}
      <div className={styles["fieldCount"]}>
        <span>Fields:</span>
        <span className={styles["countValue"]}>
          {selectedCount}/{totalCount}
        </span>
      </div>

      {/* Filter count */}
      {filterCount > 0 && (
        <div className={styles["fieldCount"]}>
          <span>Filters:</span>
          <span className={styles["countValue"]}>{filterCount}</span>
        </div>
      )}

      {/* Raw XML size */}
      <div className={styles["fieldCount"]}>
        <span>Raw XML:</span>
        <span className={styles["sizeValue"]}>{formatBytes(rawXmlSize)}</span>
      </div>

      {/* Report size */}
      <div className={styles["fieldCount"]}>
        <span>Report:</span>
        <span className={styles["sizeValue"]}>{formatBytes(reportSize)}</span>
      </div>

      {/* Data-informed estimate (when provider available) */}
      {dataEstimate && (
        <div className={styles["fieldCount"]}>
          <span>Est.:</span>
          <span className={styles["sizeValue"]}>{dataEstimate.estimatedKb} KB</span>
          <span className={styles["sourceTag"]}>({dataEstimate.source})</span>
        </div>
      )}

      {/* Reduction percentage */}
      <div className={styles["reduction"]}>
        <span>Reduction:</span>
        <span
          className={`${styles["reductionValue"]} ${reductionColourClass(clampedPct)}`}
        >
          {clampedPct.toFixed(0)}%
        </span>
      </div>

      {/* Gauge bar */}
      <div
        className={styles["gauge"]}
        role="progressbar"
        aria-valuenow={clampedPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Payload reduction"
      >
        <div
          className={`${styles["gaugeFill"]} ${gaugeColourClass(clampedPct)}`}
          style={{ width: gaugeWidth }}
        />
      </div>

      {/* ARIA live region — announces metric changes */}
      <div aria-live="polite" aria-atomic="true" className={styles["srOnly"]}>
        {selectedCount} of {totalCount} fields selected, {clampedPct.toFixed(0)}% reduction, Raw XML {formatBytes(rawXmlSize)}, Report {formatBytes(reportSize)}
      </div>

      {/* Payload explosion warnings */}
      {payloadExplosions.length > 0 && (
        <div className={styles["warnings"]}>
          {payloadExplosions.map((e) => (
            <div key={e.nodeId} className={styles["warningRow"]} role="alert">
              <span className={styles["warningIcon"]} aria-hidden="true">&#x26A0;</span>
              <span>&ldquo;{e.nodeName}&rdquo; contributes {e.contributionPct}% of estimated payload</span>
            </div>
          ))}
        </div>
      )}

      {/* Validation warnings — missing required ancestors */}
      {validationWarnings.length > 0 && (
        <div className={styles["warnings"]}>
          {validationWarnings.map((w) => (
            <div key={w.node.id} className={styles["warningRow"]} role="alert">
              <span className={styles["warningIcon"]} aria-hidden="true">&#x26A0;</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
