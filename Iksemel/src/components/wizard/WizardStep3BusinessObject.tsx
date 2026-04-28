import { useState } from "react";
import type { SchemaNode } from "@/types";
import styles from "./WizardStep3BusinessObject.module.css";

interface WizardStep3BusinessObjectProps {
  readonly schema: readonly SchemaNode[];
  readonly selectedXPath: string | null;
  readonly onSelect: (xpath: string) => void;
}

function getCandidates(schema: readonly SchemaNode[]): readonly SchemaNode[] {
  const root = schema[0];
  if (root == null) return [];
  return root.children.filter((n) => !n.isAttribute);
}

export function WizardStep3BusinessObject({ schema, selectedXPath, onSelect }: WizardStep3BusinessObjectProps) {
  const candidates = getCandidates(schema);
  const [hovered, setHovered] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <div className={styles["step"]}>
        <p className={styles["empty"]}>No root elements found in this schema. Go back and load a different file.</p>
      </div>
    );
  }

  const previewKey = selectedXPath
    ? selectedXPath.replace("//", "")
    : hovered;
  const previewNode = previewKey
    ? (candidates.find((c) => c.name === previewKey) ?? null)
    : null;
  const previewFields = previewNode ? previewNode.children.filter((c) => !c.isAttribute) : [];

  return (
    <div className={styles["step"]}>
      <h2 className={styles["heading"]}>Choose your business object</h2>
      <p className={styles["sub"]}>Select the element that represents one row in your report</p>
      <div className={styles["layout"]}>
        <div className={styles["list"]} role="listbox" aria-label="Business object candidates">
          {candidates.map((candidate) => {
            const xpath = `//${candidate.name}`;
            const isSelected = selectedXPath === xpath;
            const fieldCount = candidate.children.filter((c) => !c.isAttribute).length;
            return (
              <button
                key={candidate.name}
                aria-selected={isSelected}
                aria-label={`${candidate.name} — ${fieldCount} fields`}
                className={`${styles["item"]} ${isSelected ? styles["itemSelected"] : ""}`}
                onClick={() => onSelect(xpath)}
                onMouseEnter={() => setHovered(candidate.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className={styles["itemName"]}>{candidate.name}</span>
                <span className={styles["itemCount"]}>{fieldCount} fields</span>
              </button>
            );
          })}
        </div>
        <div className={styles["preview"]}>
          {previewNode == null ? (
            <p className={styles["previewEmpty"]}>Hover or select an element to preview its fields</p>
          ) : (
            <>
              <p className={styles["previewTitle"]}>{previewNode.name}</p>
              {previewFields.length === 0 ? (
                <p className={styles["previewEmpty"]}>No child fields</p>
              ) : (
                <ul className={styles["fieldList"]}>
                  {previewFields.map((f) => (
                    <li key={f.id} className={styles["fieldItem"]}>
                      <span className={styles["fieldName"]}>{f.name}</span>
                      <span className={styles["fieldType"]}>{f.typeName || "complex"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
