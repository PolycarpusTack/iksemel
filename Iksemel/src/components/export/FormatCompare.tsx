import { useState, useMemo } from "react";
import { generateXslt, getRegisteredFormats } from "@engine/generation";
import type { ExportFormat, ColumnDefinition, SortConfig, StyleConfig, DocumentTemplate } from "@/types";
import { CodeViewer } from "./CodeViewer";
import styles from "./FormatCompare.module.css";

interface FormatCompareProps {
  readonly columns: readonly ColumnDefinition[];
  readonly rowSource: string;
  readonly style: StyleConfig;
  readonly groupBy: string | null;
  readonly sortBy: SortConfig | null;
  readonly title: string;
  readonly documentTemplate: DocumentTemplate | null;
}

function generateSafe(input: Parameters<typeof generateXslt>[0]): string {
  try {
    return generateXslt(input);
  } catch {
    return "<!-- Not available for this format -->";
  }
}

export function FormatCompare({ columns, rowSource, style, groupBy, sortBy, title, documentTemplate }: FormatCompareProps) {
  const formats = useMemo(() => getRegisteredFormats(), []);
  const [leftFormat, setLeftFormat] = useState<ExportFormat>("xlsx");
  const [rightFormat, setRightFormat] = useState<ExportFormat>("html");

  const sharedInput = useMemo(() => ({ columns, rowSource, style, groupBy, sortBy, title, documentTemplate }), [columns, rowSource, style, groupBy, sortBy, title, documentTemplate]);

  const leftXslt = useMemo(() => generateSafe({ ...sharedInput, format: leftFormat }), [sharedInput, leftFormat]);
  const rightXslt = useMemo(() => generateSafe({ ...sharedInput, format: rightFormat }), [sharedInput, rightFormat]);

  return (
    <div className={styles["container"]}>
      <div className={styles["pane"]}>
        <div className={styles["paneHeader"]}>
          <label className={styles["label"]} htmlFor="compare-left">Format</label>
          <select
            id="compare-left"
            className={styles["formatSelect"]}
            value={leftFormat}
            onChange={(e) => setLeftFormat(e.target.value as ExportFormat)}
          >
            {formats.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className={styles["paneBody"]}>
          <CodeViewer code={leftXslt} filename={`compare-${leftFormat}.xslt`} language="xslt" />
        </div>
      </div>
      <div className={styles["divider"]} aria-hidden="true" />
      <div className={styles["pane"]}>
        <div className={styles["paneHeader"]}>
          <label className={styles["label"]} htmlFor="compare-right">Format</label>
          <select
            id="compare-right"
            className={styles["formatSelect"]}
            value={rightFormat}
            onChange={(e) => setRightFormat(e.target.value as ExportFormat)}
          >
            {formats.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className={styles["paneBody"]}>
          <CodeViewer code={rightXslt} filename={`compare-${rightFormat}.xslt`} language="xslt" />
        </div>
      </div>
    </div>
  );
}
