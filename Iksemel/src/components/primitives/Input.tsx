import { type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import styles from "./Input.module.css";

interface BaseFieldProps {
  label?: string;
  description?: string;
}

interface TextInputProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {
  multiline?: false;
  mono?: boolean;
  compact?: boolean;
}

interface TextAreaProps extends BaseFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  multiline: true;
  mono?: boolean;
  compact?: boolean;
}

type InputProps = TextInputProps | TextAreaProps;

export function Input({ label, description, multiline, mono, compact, ...props }: InputProps) {
  const inputClasses = [
    styles["input"],
    multiline ? styles["textarea"] : "",
    mono ? styles["mono"] : "",
    compact ? styles["compact"] : "",
  ]
    .filter(Boolean)
    .join(" ");

  let input: ReactNode;
  if (multiline) {
    const { multiline: _, mono: _m, compact: _c, ...textareaProps } = props as TextAreaProps;
    input = <textarea className={inputClasses} {...textareaProps} />;
  } else {
    const { multiline: _, mono: _m, compact: _c, ...inputProps } = props as TextInputProps;
    input = <input className={inputClasses} {...inputProps} />;
  }

  if (!label) {
    return input;
  }

  return (
    <div className={styles["field"]}>
      <label className={styles["label"]}>
        {label}
        {description && <span className={styles["description"]}> — {description}</span>}
      </label>
      {input}
    </div>
  );
}
