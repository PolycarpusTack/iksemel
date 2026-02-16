import type { CheckState } from "@/types";
import styles from "./Checkbox.module.css";

interface CheckboxProps {
  state: CheckState;
  onChange: () => void;
  /** Accessible label for screen readers */
  label?: string;
}

/**
 * Tri-state checkbox component.
 *
 * Each state is visually distinguishable by both colour and shape:
 * - checked: green background with checkmark (✓ shape)
 * - partial: yellow border with horizontal dash (— shape)
 * - unchecked: grey border, empty
 */
export function Checkbox({ state, onChange, label }: CheckboxProps) {
  const stateClass = state === "checked" ? styles["checked"] : state === "partial" ? styles["partial"] : "";

  const ariaLabel =
    label ??
    (state === "checked"
      ? "checked"
      : state === "partial"
        ? "partially checked"
        : "not checked");

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "checked" ? true : state === "partial" ? "mixed" : false}
      aria-label={ariaLabel}
      className={`${styles["checkbox"]} ${stateClass}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
    >
      {state === "checked" && (
        <svg className={styles["checkmark"]} width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M2 5L4.5 7.5L8 3"
            stroke="#0a0a0f"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
      {state === "partial" && <div className={styles["dash"]} aria-hidden="true" />}
    </button>
  );
}
