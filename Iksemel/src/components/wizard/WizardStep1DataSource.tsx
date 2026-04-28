import styles from "./WizardStep1DataSource.module.css";

type SourceType = "xsd" | "xml-sample";

interface WizardStep1DataSourceProps {
  readonly selectedSource: SourceType | null;
  readonly onSelect: (source: SourceType) => void;
}

const SOURCES: { id: SourceType; label: string; detail: string }[] = [
  {
    id: "xsd",
    label: "XSD Schema",
    detail: "Upload an XML Schema Definition file · Precise field types",
  },
  {
    id: "xml-sample",
    label: "XML Sample",
    detail: "Infer structure from a real XML file · Good when no XSD available",
  },
];

export function WizardStep1DataSource({ selectedSource, onSelect }: WizardStep1DataSourceProps) {
  return (
    <div className={styles["step"]}>
      <h2 className={styles["heading"]}>Choose your data source</h2>
      <div className={styles["list"]} role="radiogroup" aria-label="Data source">
        {SOURCES.map(({ id, label, detail }) => {
          const isSelected = selectedSource === id;
          return (
            <button
              key={id}
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              className={`${styles["card"]} ${isSelected ? styles["cardSelected"] : ""}`}
              onClick={() => onSelect(id)}
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
