import type { PolicyViolation } from "@/types";
import styles from "./PolicyViolations.module.css";

interface PolicyViolationsProps {
  violations: readonly PolicyViolation[];
}

export function PolicyViolations({ violations }: PolicyViolationsProps) {
  if (violations.length === 0) return null;

  return (
    <div className={styles["container"]} role="alert">
      {violations.map((v) => (
        <div
          key={v.ruleId}
          className={`${styles["violation"]} ${v.severity === "error" ? styles["error"] : styles["warning"]}`}
        >
          <span className={styles["icon"]} aria-hidden="true">
            {v.severity === "error" ? "\u2718" : "\u26A0"}
          </span>
          <span className={styles["message"]}>{v.message}</span>
        </div>
      ))}
    </div>
  );
}
