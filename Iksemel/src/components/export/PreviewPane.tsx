import { useState } from "react";
import type { ExportFormat, ColumnDefinition, StyleConfig } from "@/types";
import { PreviewTable } from "./PreviewTable";
import { CodeViewer } from "./CodeViewer";
import styles from "./PreviewPane.module.css";

interface PreviewPaneProps {
  readonly xsltOutput: string;
  readonly format: ExportFormat;
  readonly columns: readonly ColumnDefinition[];
  readonly style: StyleConfig;
  readonly title: string;
  readonly groupBy: string | null;
}

export function PreviewPane({ xsltOutput, columns, style, title, groupBy }: PreviewPaneProps) {
  const [view, setView] = useState<"table" | "code">("table");

  return (
    <div className={styles["pane"]}>
      <div className={styles["header"]}>
        <span className={styles["label"]}>Preview</span>
        <div className={styles["toggle"]} role="group" aria-label="Preview view">
          <button
            className={`${styles["toggleBtn"]} ${view === "table" ? styles["toggleBtnActive"] ?? "" : ""}`}
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
          >
            Table
          </button>
          <button
            className={`${styles["toggleBtn"]} ${view === "code" ? styles["toggleBtnActive"] ?? "" : ""}`}
            onClick={() => setView("code")}
            aria-pressed={view === "code"}
          >
            XSLT
          </button>
        </div>
      </div>
      <div className={styles["body"]}>
        {view === "table" ? (
          <PreviewTable columns={columns} style={style} groupBy={groupBy} title={title} />
        ) : (
          <CodeViewer code={xsltOutput} filename="preview.xslt" language="xslt" />
        )}
      </div>
    </div>
  );
}
