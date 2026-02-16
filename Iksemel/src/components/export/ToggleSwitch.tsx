import { useId } from "react";
import styles from "./ToggleSwitch.module.css";

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ label, checked, onChange }: ToggleSwitchProps) {
  const id = useId();

  return (
    <label className={styles["toggle"]} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={styles["hidden"]}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        role="switch"
        aria-checked={checked}
      />
      <span className={`${styles["track"]} ${checked ? styles["trackChecked"] : ""}`}>
        <span className={`${styles["thumb"]} ${checked ? styles["thumbChecked"] : ""}`} />
      </span>
      <span className={styles["label"]}>{label}</span>
    </label>
  );
}
