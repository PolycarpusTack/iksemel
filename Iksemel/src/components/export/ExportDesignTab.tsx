import type { ExportFormat, SortConfig, RepeatingElement, SelectedLeaf } from "@/types";
import { Select } from "@components/primitives";
import { DocumentTemplateUpload } from "@components/document-templates/DocumentTemplateUpload";
import { TemplateStylePreview } from "@components/document-templates/TemplateStylePreview";
import { TemplateMappingPanel } from "@components/document-templates/TemplateMappingPanel";
import styles from "./ExportDesignTab.module.css";

interface ExportDesignTabProps {
  format: ExportFormat;
  rowSource: string;
  groupBy: string | null;
  sortBy: SortConfig | null;
  repeatingElements: readonly RepeatingElement[];
  selectedLeaves: readonly SelectedLeaf[];
  onFormatChange: (format: ExportFormat) => void;
  onRowSourceChange: (source: string) => void;
  onGroupByChange: (field: string | null) => void;
  onSortByChange: (sort: SortConfig | null) => void;
}

const FORMAT_CARDS: readonly {
  id: ExportFormat;
  icon: string;
  name: string;
  desc: string;
}[] = [
  { id: "xlsx", icon: "XLS", name: "Excel Spreadsheet", desc: "Best for data analysis, filtering, and pivot tables" },
  { id: "csv", icon: "CSV", name: "CSV File", desc: "Universal data exchange, RFC 4180 compliant" },
  { id: "word", icon: "DOC", name: "Word Document", desc: "Formatted reports with page layout" },
  { id: "html", icon: "HTM", name: "HTML Report", desc: "Responsive web-ready output with print styles" },
];

const NATIVE_FORMAT_CARDS: readonly {
  id: ExportFormat;
  icon: string;
  name: string;
  desc: string;
}[] = [
  { id: "xlsx-native", icon: "XLSX", name: "Native Excel", desc: "True OOXML spreadsheet with native cell types and styles" },
  { id: "docx-native", icon: "DOCX", name: "Native Word", desc: "True OOXML document with WordprocessingML table" },
  { id: "pptx-native", icon: "PPTX", name: "Native PowerPoint", desc: "OOXML presentation with data table on slide" },
  { id: "ods-native", icon: "ODS", name: "OpenDocument Spreadsheet", desc: "ODF spreadsheet for LibreOffice/OpenOffice" },
  { id: "odt-native", icon: "ODT", name: "OpenDocument Text", desc: "ODF text document with data table" },
];

const NATIVE_FORMAT_IDS = new Set<ExportFormat>(NATIVE_FORMAT_CARDS.map((c) => c.id));

export function ExportDesignTab({
  format,
  rowSource,
  groupBy,
  sortBy,
  repeatingElements,
  selectedLeaves,
  onFormatChange,
  onRowSourceChange,
  onGroupByChange,
  onSortByChange,
}: ExportDesignTabProps) {
  const handleSortFieldChange = (field: string) => {
    if (!field) {
      onSortByChange(null);
    } else {
      onSortByChange({ field, dir: sortBy?.dir ?? "asc" });
    }
  };

  const toggleSortDir = () => {
    if (!sortBy) return;
    onSortByChange({ field: sortBy.field, dir: sortBy.dir === "asc" ? "desc" : "asc" });
  };

  return (
    <div className={styles["container"]}>
      <div className={styles["section"]}>
        <span className={styles["sectionLabel"]}>Output Format</span>
        <div className={styles["formatGrid"]} role="radiogroup" aria-label="Output format">
          {FORMAT_CARDS.map((card) => (
            <button
              key={card.id}
              role="radio"
              aria-checked={format === card.id}
              className={`${styles["formatCard"]} ${format === card.id ? styles["formatCardActive"] : ""}`}
              onClick={() => onFormatChange(card.id)}
            >
              <span className={styles["formatIcon"]} aria-hidden="true">{card.icon}</span>
              <span className={styles["formatName"]}>{card.name}</span>
              <span className={styles["formatDesc"]}>{card.desc}</span>
            </button>
          ))}
        </div>

        <span className={styles["sectionLabel"]} style={{ marginTop: "12px" }}>Native Formats</span>
        <div className={styles["formatGrid"]} role="radiogroup" aria-label="Native output format">
          {NATIVE_FORMAT_CARDS.map((card) => (
            <button
              key={card.id}
              role="radio"
              aria-checked={format === card.id}
              className={`${styles["formatCard"]} ${format === card.id ? styles["formatCardActive"] : ""}`}
              onClick={() => onFormatChange(card.id)}
            >
              <span className={styles["formatIcon"]} aria-hidden="true">{card.icon}</span>
              <span className={styles["formatName"]}>{card.name}</span>
              <span className={styles["formatDesc"]}>{card.desc}</span>
            </button>
          ))}
        </div>

        {NATIVE_FORMAT_IDS.has(format) && (
          <div className={styles["section"]} style={{ marginTop: "12px" }}>
            <span className={styles["sectionLabel"]}>Document Template (optional)</span>
            <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 8px" }}>
              Upload a styled document as template to preserve its formatting in the output.
            </p>
            <DocumentTemplateUpload />
            <TemplateStylePreview />
            <TemplateMappingPanel />
          </div>
        )}
      </div>

      <div className={styles["section"]}>
        <span className={styles["sectionLabel"]}>Row Source</span>
        <div className={styles["fieldWrapper"]}>
          <label className={styles["fieldLabel"]} htmlFor="row-source-select">
            Repeating element
          </label>
          <Select
            id="row-source-select"
            value={rowSource}
            onChange={(e) => onRowSourceChange(e.target.value)}
          >
            <option value="">-- Select --</option>
            {repeatingElements.map((el) => (
              <option key={el.id} value={el.xpath}>{el.name} ({el.xpath})</option>
            ))}
          </Select>
        </div>
      </div>

      <div className={styles["section"]}>
        <span className={styles["sectionLabel"]}>Grouping &amp; Sorting</span>
        <div className={styles["fieldWrapper"]}>
          <label className={styles["fieldLabel"]} htmlFor="group-by-select">Group by</label>
          <Select
            id="group-by-select"
            value={groupBy ?? ""}
            onChange={(e) => onGroupByChange(e.target.value || null)}
          >
            <option value="">None</option>
            {selectedLeaves.map((leaf) => (
              <option key={leaf.id} value={leaf.xpath}>{leaf.name}</option>
            ))}
          </Select>
        </div>

        <div className={styles["sortRow"]}>
          <div className={`${styles["fieldWrapper"]} ${styles["sortSelect"]}`}>
            <label className={styles["fieldLabel"]} htmlFor="sort-by-select">Sort by</label>
            <Select
              id="sort-by-select"
              value={sortBy?.field ?? ""}
              onChange={(e) => handleSortFieldChange(e.target.value)}
            >
              <option value="">None</option>
              {selectedLeaves.map((leaf) => (
                <option key={leaf.id} value={leaf.xpath}>{leaf.name}</option>
              ))}
            </Select>
          </div>
          <button
            className={styles["dirToggle"]}
            onClick={toggleSortDir}
            disabled={!sortBy}
            aria-label={`Sort direction: ${sortBy?.dir === "desc" ? "descending" : "ascending"}`}
          >
            {sortBy?.dir === "desc" ? "Z-A" : "A-Z"}
          </button>
        </div>
      </div>
    </div>
  );
}
