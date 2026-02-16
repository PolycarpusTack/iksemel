import { type SelectHTMLAttributes } from "react";
import styles from "./Select.module.css";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  compact?: boolean;
  mono?: boolean;
}

export function Select({ compact, mono, className, children, ...props }: SelectProps) {
  const classes = [
    styles["select"],
    compact ? styles["compact"] : "",
    mono ? styles["mono"] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <select className={classes} {...props}>
      {children}
    </select>
  );
}
