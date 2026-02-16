/**
 * Supported output formats for XSLT generation.
 */
export type ExportFormat =
  | "xlsx" | "csv" | "word" | "html"
  | "xlsx-native"
  | "docx-native"
  | "pptx-native"
  | "ods-native"
  | "odt-native";

/**
 * Column definition for the export table.
 * Each column maps a schema field to a table column with display configuration.
 */
export interface ColumnDefinition {
  /** Unique identifier (typically the schema node ID) */
  readonly id: string;
  /** XPath expression relative to the row source */
  readonly xpath: string;
  /** Column header text displayed in the output */
  readonly header: string;
  /** Data format hint for the output */
  readonly format: "auto" | "text" | "date" | "datetime" | "number";
  /** Text alignment in the output */
  readonly align: "left" | "center" | "right";
  /** Column width in pixels */
  readonly width: number;
  /** Full XPath from root (for reference, not used in XSLT) */
  readonly fullPath: string;
}

/**
 * Sort configuration for the export.
 */
export interface SortConfig {
  /** XPath of the field to sort by */
  readonly field: string;
  /** Sort direction */
  readonly dir: "asc" | "desc";
}

/**
 * Style configuration for the export output.
 * Derived from style presets with optional overrides.
 */
export interface StyleConfig {
  /** Style preset name */
  readonly name: string;
  /** Header background colour (CSS colour value) */
  readonly headerBg: string;
  /** Header foreground colour (CSS colour value) */
  readonly headerFg: string;
  /** Alternate row background colour */
  readonly altRowBg: string;
  /** Group header background colour */
  readonly groupBg: string;
  /** Font family CSS value */
  readonly fontFamily: string;
  /** Font size in points */
  readonly fontSize: string;
  /** Whether to show the report title */
  readonly showTitle: boolean;
  /** Whether to show the report footer */
  readonly showFooter: boolean;
  /** Whether to enable Excel AutoFilter (xlsx only) */
  readonly autoFilter: boolean;
  /** Page orientation (word only) */
  readonly orientation: "portrait" | "landscape";
  /** CSS delimiter character (csv only) */
  readonly delimiter: string;
  /** Quote character (csv only) */
  readonly quoteChar: string;
  /** Page margins CSS value (word only) */
  readonly margins: string;
}

/**
 * Report metadata for the package definition file.
 */
export interface ReportMetadata {
  /** Report display name */
  readonly name: string;
  /** Report description */
  readonly description: string;
  /** Semantic version string */
  readonly version: string;
  /** Author name */
  readonly author: string;
  /** Report category (e.g. "Schedule", "Rights", "EPG") */
  readonly category: string;
  /** Searchable tags */
  readonly tags: readonly string[];
  /** Whether scheduled execution is enabled */
  readonly scheduleEnabled: boolean;
  /** Cron expression for scheduling */
  readonly scheduleCron: string;
  /** Human-readable schedule description */
  readonly scheduleDescription: string;
  /** Output file path */
  readonly outputPath: string;
  /** Email recipients for auto-delivery */
  readonly emailRecipients: string;
  /** Whether to overwrite existing output files */
  readonly overwrite: boolean;
  /** XSLT processor to use */
  readonly xsltProcessor: string;
  /** Active style preset key */
  readonly stylePreset: string;
}

/**
 * Named style presets available for export styling.
 */
export type StylePresetKey = "corporate" | "broadcast" | "clean" | "warm" | "modern";

/**
 * Style preset definition (subset of StyleConfig used for preset switching).
 */
export interface StylePreset {
  readonly name: string;
  readonly headerBg: string;
  readonly headerFg: string;
  readonly altRowBg: string;
  readonly groupBg: string;
  readonly fontFamily: string;
  readonly fontSize: string;
}

/**
 * Input to the XSLT generator.
 * Encapsulates all data needed to generate an XSLT stylesheet.
 */
export interface GeneratorInput {
  /** Output format */
  readonly format: ExportFormat;
  /** Column definitions */
  readonly columns: readonly ColumnDefinition[];
  /** XPath expression for the row source (e.g. "//Slot") */
  readonly rowSource: string;
  /** Style configuration */
  readonly style: StyleConfig;
  /** Optional XPath for grouping */
  readonly groupBy: string | null;
  /** Optional sort configuration */
  readonly sortBy: SortConfig | null;
  /** Report title */
  readonly title: string;
  /** Optional document template for native format generation */
  readonly documentTemplate: DocumentTemplate | null;
}

/**
 * Reference to a document template — imported from the document-templates module.
 * Kept minimal here to avoid circular dependency; full type lives in engine/document-templates/types.
 */
export interface DocumentTemplate {
  readonly id: string;
  readonly name: string;
  readonly sourceFormat: DocumentTemplateFormat;
  readonly targetFormat: ExportFormat;
  readonly scaffoldEntries: readonly TemplateZipEntry[];
  readonly injectionTarget: string;
  readonly injectionXPath: string;
  readonly extractedStyles: ExtractedStyles | null;
  readonly uploadedAt: string;
  readonly originalFilename: string;
}

export type DocumentTemplateFormat = "xlsx" | "docx" | "pptx" | "ods" | "odt";

export interface TemplateZipEntry {
  readonly path: string;
  readonly content: string | Uint8Array;
  readonly encoding: "utf-8" | "binary";
  readonly isDataTarget: boolean;
}

export interface ExtractedStyles {
  readonly type: "spreadsheet" | "document" | "presentation";
  readonly numberFormats: readonly NumberFormatDef[];
  readonly fonts: readonly FontDef[];
  readonly fills: readonly FillDef[];
  readonly borders: readonly BorderDef[];
  readonly cellStyles: readonly CellStyleDef[];
  readonly themeColors: readonly string[];
}

export interface NumberFormatDef {
  readonly id: number;
  readonly formatCode: string;
}

export interface FontDef {
  readonly name: string;
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly color: string;
}

export interface FillDef {
  readonly patternType: string;
  readonly fgColor: string;
  readonly bgColor: string;
}

export interface BorderDef {
  readonly style: string;
  readonly color: string;
}

export interface CellStyleDef {
  readonly name: string;
  readonly fontIndex: number;
  readonly fillIndex: number;
  readonly borderIndex: number;
  readonly numberFormatId: number;
}
