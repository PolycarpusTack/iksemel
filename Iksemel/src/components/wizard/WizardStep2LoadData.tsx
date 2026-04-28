import { useState, useCallback } from "react";
import { SchemaUpload } from "@components/shared";
import { parseXSD, parseXmlSample } from "@engine/parser";
import type { SchemaNode, ParseWarning } from "@/types";
import styles from "./WizardStep2LoadData.module.css";

interface WizardStep2LoadDataProps {
  readonly source: "xsd" | "xml-sample";
  readonly onLoaded: (roots: readonly SchemaNode[], warnings: readonly ParseWarning[]) => void;
}

export function WizardStep2LoadData({ source, onLoaded }: WizardStep2LoadDataProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSchemaLoad = useCallback(
    (rawText: string) => {
      setError(null);
      const result = source === "xsd" ? parseXSD(rawText) : parseXmlSample(rawText);
      if (result.roots.length === 0 && result.warnings.length > 0) {
        setError(result.warnings[0].message);
        return;
      }
      onLoaded(result.roots, result.warnings);
    },
    [source, onLoaded],
  );

  return (
    <div className={styles["step"]}>
      <h2 className={styles["heading"]}>
        {source === "xsd" ? "Upload your XSD schema" : "Upload an XML sample file"}
      </h2>
      <SchemaUpload onSchemaLoad={handleSchemaLoad} hasSchema={false} />
      {error && (
        <p className={styles["error"]} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
