import { Button } from "@components/primitives";
import styles from "./PackageFileList.module.css";

interface PackageFileListProps {
  slug: string;
  filterXml: string;
  xsltOutput: string;
  reportXml: string;
  hasSelection: boolean;
  hasColumns: boolean;
  hasMetadata: boolean;
  /** Disable all download buttons (e.g. due to policy violations) */
  disableDownload?: boolean;
  onViewTab: (tab: string) => void;
  onDownloadFile: (content: string, filename: string) => void;
  onDownloadAll: () => void;
}

type FileStatus = "green" | "amber" | "gray";

interface FileEntry {
  label: string;
  filename: string;
  content: string;
  status: FileStatus;
  tab: string;
}

function formatSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getStatusClass(status: FileStatus): string {
  if (status === "green") return styles["statusGreen"] ?? "";
  if (status === "amber") return styles["statusAmber"] ?? "";
  return styles["statusGray"] ?? "";
}

export function PackageFileList({
  slug,
  filterXml,
  xsltOutput,
  reportXml,
  hasSelection,
  hasColumns,
  hasMetadata,
  disableDownload,
  onViewTab,
  onDownloadFile,
  onDownloadAll,
}: PackageFileListProps) {
  const filterStatus: FileStatus = hasSelection ? "green" : filterXml.length > 0 ? "amber" : "gray";
  const xsltStatus: FileStatus = hasColumns ? "green" : "gray";
  const reportStatus: FileStatus = hasMetadata ? "green" : "gray";

  const files: readonly FileEntry[] = [
    {
      label: "Filter XML",
      filename: `${slug}-filter.xml`,
      content: filterXml,
      status: filterStatus,
      tab: "filter",
    },
    {
      label: "XSLT Transform",
      filename: `${slug}-transform.xslt`,
      content: xsltOutput,
      status: xsltStatus,
      tab: "xslt",
    },
    {
      label: "Report Definition",
      filename: `${slug}-report.xml`,
      content: reportXml,
      status: reportStatus,
      tab: "report",
    },
  ];

  return (
    <div className={styles["container"]}>
      <span className={styles["sectionLabel"]}>Package Files</span>

      <div className={styles["fileList"]}>
        {files.map((file) => (
          <div key={file.tab} className={styles["fileRow"]}>
            <span
              className={`${styles["statusDot"]} ${getStatusClass(file.status)}`}
              title={file.status === "green" ? "Ready" : file.status === "amber" ? "Partial" : "Empty"}
            />
            <div className={styles["fileInfo"]}>
              <span className={styles["fileName"]}>{file.filename}</span>
              <span className={styles["fileLabel"]}>{file.label}</span>
            </div>
            <span className={styles["fileSize"]}>{formatSize(file.content)}</span>
            <div className={styles["fileActions"]}>
              <Button size="sm" variant="ghost" onClick={() => onViewTab(file.tab)}>
                View
              </Button>
              <Button
                size="sm"
                onClick={() => onDownloadFile(file.content, file.filename)}
                disabled={file.content.length === 0 || disableDownload}
              >
                Download
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles["downloadAllWrapper"]}>
        <Button variant="primary" onClick={onDownloadAll} disabled={disableDownload}>
          Download All 3 Files
        </Button>
      </div>
    </div>
  );
}
