/**
 * Size Warning Modal Component
 * 
 * Warns users when their export configuration will generate large payloads.
 */

import { useCallback, useEffect, useRef } from "react";
import { formatBytes } from "@engine/analysis";
import type { EfficiencyScore } from "@engine/analysis";
import styles from "./SizeWarningModal.module.css";

interface SizeWarningModalProps {
  estimatedSize: number;
  efficiencyScore: EfficiencyScore | null;
  onProceed: () => void;
  onCancel: () => void;
  onOptimize: () => void;
}

const SIZE_THRESHOLDS = {
  WARNING: 50 * 1024 * 1024, // 50 MB
  CRITICAL: 200 * 1024 * 1024, // 200 MB
};

export function SizeWarningModal({
  estimatedSize,
  efficiencyScore,
  onProceed,
  onCancel,
  onOptimize,
}: SizeWarningModalProps) {
  const isCritical = estimatedSize >= SIZE_THRESHOLDS.CRITICAL;
  const isWarning = estimatedSize >= SIZE_THRESHOLDS.WARNING;

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstFocusableRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const formatSize = useCallback((bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return formatBytes(bytes);
  }, []);
  
  const getTitle = () => {
    if (isCritical) return "⚠️ Critical: Very Large Export";
    if (isWarning) return "⚠️ Warning: Large Export";
    return "📊 Export Size Notice";
  };
  
  const getMessage = () => {
    if (isCritical) {
      return `Your current configuration will generate approximately ${formatSize(estimatedSize)} of raw XML data. This may cause performance issues, timeouts, or memory problems.`;
    }
    if (isWarning) {
      return `Your current configuration will generate approximately ${formatSize(estimatedSize)} of raw XML data. Consider optimizing your filters to reduce the payload size.`;
    }
    return `Your export will generate approximately ${formatSize(estimatedSize)} of data.`;
  };
  
  return (
    <div className={styles["overlay"]} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div ref={modalRef} className={styles["modal"]}>
        <div className={`${styles["header"]} ${isCritical ? styles["critical"] : isWarning ? styles["warning"] : ""}`}>
          <h2 id="modal-title" className={styles["title"]}>{getTitle()}</h2>
        </div>
        
        <div className={styles["content"]}>
          <p className={styles["message"]}>{getMessage()}</p>
          
          <div className={styles["sizeDisplay"]}>
            <span className={styles["sizeLabel"]}>Estimated Raw XML Size:</span>
            <span className={`${styles["sizeValue"]} ${isCritical ? styles["critical"] : isWarning ? styles["warning"] : ""}`}>
              {formatSize(estimatedSize)}
            </span>
          </div>
          
          {efficiencyScore && efficiencyScore.grade !== "A" && efficiencyScore.grade !== "B" && (
            <div className={styles["efficiencyNotice"]}>
              <div className={styles["efficiencyHeader"]}>
                <span className={styles["efficiencyLabel"]}>Current Efficiency Grade:</span>
                <span className={`${styles["gradeBadge"]} ${styles[`grade${efficiencyScore.grade}`]}`}>
                  {efficiencyScore.grade}
                </span>
              </div>
              <p className={styles["efficiencyTip"]}>
                Your filter configuration could be more efficient. Review the recommendations to reduce payload size.
              </p>
            </div>
          )}
          
          <div className={styles["recommendations"]}>
            <h3 className={styles["recTitle"]}>Quick Tips:</h3>
            <ul className={styles["recList"]}>
              <li>Use filters on repeating elements to limit data volume</li>
              <li>Deselect fields you don't actually need</li>
              <li>Apply date ranges to limit time periods</li>
              <li>Use enumeration filters for categorical data</li>
            </ul>
          </div>
        </div>
        
        <div className={styles["actions"]}>
          <button
            ref={firstFocusableRef}
            type="button"
            className={styles["optimizeBtn"]}
            onClick={onOptimize}
          >
            🛠️ Review & Optimize
          </button>
          <button
            type="button"
            className={styles["cancelBtn"]}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles["proceedBtn"]} ${isCritical ? styles["critical"] : ""}`}
            onClick={onProceed}
          >
            {isCritical ? "⚠️ Proceed Anyway" : "Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Checks if a size warning should be shown.
 */
export function shouldShowSizeWarning(estimatedSize: number): boolean {
  return estimatedSize >= SIZE_THRESHOLDS.WARNING;
}

/**
 * Determines if export should be blocked due to excessive size.
 */
export function shouldBlockExport(estimatedSize: number): boolean {
  return estimatedSize >= SIZE_THRESHOLDS.CRITICAL;
}
