import { useState, useEffect } from "react";
import styles from "./AntiPatternWarning.module.css";

interface AntiPatternWarningProps {
  reductionPct: number;
  threshold?: number;
  onDismiss?: () => void;
}

/**
 * Contextual warning shown when the payload reduction is below a threshold.
 * Dismissible by the user. Uses ARIA role="alert" for immediate announcement.
 */
export function AntiPatternWarning({
  reductionPct,
  threshold = 20,
  onDismiss,
}: AntiPatternWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when crossing the threshold boundary
  const isBelowThreshold = reductionPct < threshold;
  useEffect(() => {
    setDismissed(false);
  }, [isBelowThreshold]);

  if (dismissed || reductionPct >= threshold) {
    return null;
  }

  return (
    <div className={styles["warning"]} role="alert">
      <span className={styles["icon"]} aria-hidden="true">
        &#x26A0;
      </span>

      <div className={styles["body"]}>
        <div className={styles["title"]}>Low reduction detected</div>
        <div className={styles["message"]}>
          Only {reductionPct.toFixed(0)}% of fields are being filtered.
          Selecting fewer fields improves performance and reduces payload size.
          Aim for at least {threshold}% reduction.
        </div>
      </div>

      <button
        className={styles["dismiss"]}
        onClick={() => { setDismissed(true); onDismiss?.(); }}
        aria-label="Dismiss warning"
        type="button"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M1 1L9 9M9 1L1 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
