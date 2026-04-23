import { useCallback } from "react";
import type { ReportMetadata, ExportFormat, StyleConfig, PolicyViolation } from "@/types";
import { createPackageZip } from "@engine/package";
import { MetadataEditor } from "./MetadataEditor";
import { ExecutionSettings } from "./ExecutionSettings";
import { PackageFileList } from "./PackageFileList";
import { PolicyViolations } from "./PolicyViolations";
import styles from "./PackageTab.module.css";

interface PackageTabProps {
  metadata: ReportMetadata;
  style: StyleConfig;
  format: ExportFormat;
  slug: string;
  filterXml: string;
  xsltOutput: string;
  reportXml: string;
  hasSelection: boolean;
  hasColumns: boolean;
  policyViolations?: readonly PolicyViolation[];
  onMetadataChange: (metadata: Partial<ReportMetadata>) => void;
  onViewTab: (tab: string) => void;
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function triggerBinaryDownload(content: Uint8Array, filename: string): void {
  const blob = new Blob([content], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function PackageTab({
  metadata,
  slug,
  filterXml,
  xsltOutput,
  reportXml,
  hasSelection,
  hasColumns,
  policyViolations,
  onMetadataChange,
  onViewTab,
}: PackageTabProps) {
  const hasMetadata = metadata.name.trim() !== "";

  const handleDownloadFile = useCallback((content: string, filename: string) => {
    triggerDownload(content, filename);
  }, []);

  const handleDownloadAll = useCallback(async () => {
    const files = [
      { content: filterXml, filename: `${slug}-filter.xml` },
      { content: xsltOutput, filename: `${slug}-transform.xslt` },
      { content: reportXml, filename: `${slug}-report.xml` },
    ];

    try {
      const zip = await createPackageZip(files.map((file) => ({
        path: file.filename,
        content: file.content,
      })));
      triggerBinaryDownload(zip, `${slug}-package.zip`);
      return;
    } catch {
      files.forEach((file, index) => {
        setTimeout(() => triggerDownload(file.content, file.filename), index * 300);
      });
    }
  }, [filterXml, xsltOutput, reportXml, slug]);

  const violations = policyViolations ?? [];
  const hasErrors = violations.some((v) => v.severity === "error");

  return (
    <div className={styles["container"]}>
      {violations.length > 0 && (
        <>
          <div className={styles["section"]}>
            <PolicyViolations violations={violations} />
          </div>
          <div className={styles["divider"]} />
        </>
      )}

      <div className={styles["section"]}>
        <MetadataEditor metadata={metadata} onChange={onMetadataChange} />
      </div>

      <div className={styles["divider"]} />

      <div className={styles["section"]}>
        <ExecutionSettings metadata={metadata} onChange={onMetadataChange} />
      </div>

      <div className={styles["divider"]} />

      <div className={styles["section"]}>
        <PackageFileList
          slug={slug}
          filterXml={filterXml}
          xsltOutput={xsltOutput}
          reportXml={reportXml}
          hasSelection={hasSelection}
          hasColumns={hasColumns}
          hasMetadata={hasMetadata}
          disableDownload={hasErrors}
          onViewTab={onViewTab}
          onDownloadFile={handleDownloadFile}
          onDownloadAll={handleDownloadAll}
        />
      </div>
    </div>
  );
}
