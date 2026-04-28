import { useRef, useCallback } from "react";
import styles from "./WizardStep1DataSource.module.css";

type SourceType = "xsd" | "xml-sample";

interface WizardStep1DataSourceProps {
  readonly selectedSource: SourceType | null;
  readonly onSelect: (source: SourceType) => void;
}

const SOURCES: { id: SourceType; label: string; detail: string }[] = [
  { id: "xsd", label: "XSD Schema", detail: "Upload an XML Schema Definition file · Precise field types" },
  { id: "xml-sample", label: "XML Sample", detail: "Infer structure from a real XML file · Good when no XSD available" },
];

export function WizardStep1DataSource({ selectedSource, onSelect }: WizardStep1DataSourceProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      refs.current[(index + 1) % SOURCES.length]?.focus();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      refs.current[(index - 1 + SOURCES.length) % SOURCES.length]?.focus();
    }
  }, []);

  return (
    <div className={styles["step"]}>
      <h2 className={styles["heading"]}>Choose your data source</h2>
      <div className={styles["list"]} role="radiogroup" aria-label="Data source">
        {SOURCES.map(({ id, label, detail }, index) => {
          const isSelected = selectedSource === id;
          return (
            <button
              key={id}
              ref={(el) => { refs.current[index] = el; }}
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              className={`${styles["card"]} ${isSelected ? styles["cardSelected"] : ""}`}
              onClick={() => onSelect(id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <div className={styles["cardBody"]}>
                <span className={styles["cardLabel"]}>{label}</span>
                <span className={styles["cardDetail"]}>{detail}</span>
              </div>
              {isSelected && <span className={styles["check"]} aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
