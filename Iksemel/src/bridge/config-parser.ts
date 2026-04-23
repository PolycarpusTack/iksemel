/**
 * Report definition XML parser.
 *
 * Parses a WHATS'ON Report Definition XML document (as produced by
 * `generateReportDefinition`) back into structured application state.
 * This enables the LOAD_CONFIG bridge message to restore a previously
 * saved report configuration.
 *
 * Handles missing or malformed sections gracefully by returning
 * sensible defaults rather than throwing.
 */

import type {
  ReportMetadata,
  ColumnDefinition,
  StyleConfig,
  ExportFormat,
  SortConfig,
  FilterValuesState,
  FilterValue,
  FilterOperator,
} from "@/types";
import { validateXmlDocument } from "@/utils";

// ─── Output ─────────────────────────────────────────────────────────────

/**
 * Result of parsing a report definition XML document.
 */
export interface ParsedConfig {
  readonly metadata: ReportMetadata;
  readonly columns: ColumnDefinition[];
  readonly style: Partial<StyleConfig>;
  readonly format: ExportFormat;
  readonly rowSource: string;
  readonly groupBy: string | null;
  readonly sortBy: SortConfig | null;
  readonly filterValues: FilterValuesState;
}

// ─── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_METADATA: ReportMetadata = {
  name: "",
  description: "",
  version: "1.0",
  author: "",
  category: "",
  tags: [],
  scheduleEnabled: false,
  scheduleCron: "",
  scheduleDescription: "",
  outputPath: "",
  emailRecipients: "",
  overwrite: false,
  xsltProcessor: "system-default",
  stylePreset: "corporate",
};

const DEFAULT_STYLE: Partial<StyleConfig> = {
  headerBg: "#1a365d",
  headerFg: "#ffffff",
  altRowBg: "#f9f9f9",
  fontFamily: "Calibri, sans-serif",
  fontSize: "10",
  showTitle: true,
  showFooter: true,
};

/**
 * Maps file extensions from the XML to ExportFormat values.
 */
const EXTENSION_TO_FORMAT: Readonly<Record<string, ExportFormat>> = {
  ".xlsx": "xlsx",
  ".csv": "csv",
  ".doc": "word",
  ".html": "html",
};

/**
 * Maps format name strings from the XML to ExportFormat values.
 */
const FORMAT_NAME_MAP: Readonly<Record<string, ExportFormat>> = {
  xlsx: "xlsx",
  csv: "csv",
  word: "word",
  html: "html",
};

// ─── Parser ─────────────────────────────────────────────────────────────

/**
 * Parses a WHATS'ON Report Definition XML document into structured config.
 *
 * @param reportXml - The XML string to parse
 * @returns Parsed configuration with defaults for missing sections
 *
 * @example
 * ```ts
 * const config = parseReportConfig(xmlString);
 * console.log(config.metadata.name);    // "Schedule Export"
 * console.log(config.columns.length);   // 3
 * console.log(config.format);           // "xlsx"
 * ```
 */
export function parseReportConfig(reportXml: string): ParsedConfig {
  const parsed = validateXmlDocument(reportXml, "application/xml");
  if (!parsed.valid) {
    return createDefaultConfig();
  }
  const doc = parsed.doc;

  const root = doc.documentElement;
  if (!root) {
    return createDefaultConfig();
  }

  return {
    metadata: extractMetadata(root),
    columns: extractColumns(root),
    style: extractStyle(root),
    format: extractFormat(root),
    rowSource: extractRowSource(root),
    groupBy: extractGroupBy(root),
    sortBy: extractSortBy(root),
    filterValues: extractFilterValues(root),
  };
}

// ─── Section Extractors ─────────────────────────────────────────────────

function extractMetadata(root: Element): ReportMetadata {
  const identity = findSection(root, "Identity");
  const execution = findSection(root, "Execution");
  const style = findSection(root, "Style");

  if (!identity) {
    return { ...DEFAULT_METADATA };
  }

  const tags = extractTags(identity);
  const scheduleEnabled = extractScheduleEnabled(execution);
  const scheduleCron = extractScheduleCron(execution);
  const scheduleDescription = extractScheduleDescription(execution);
  const outputPath = extractOutputPath(execution);
  const emailRecipients = extractEmailRecipients(execution);
  const overwrite = extractOverwrite(execution);
  const xsltProcessor = extractXsltProcessor(execution);
  const stylePreset = style?.getAttribute("preset") ?? "corporate";

  return {
    name: getChildText(identity, "Name"),
    description: getChildText(identity, "Description"),
    version: getChildText(identity, "Version") || "1.0",
    author: getChildText(identity, "Author"),
    category: getChildText(identity, "Category"),
    tags,
    scheduleEnabled,
    scheduleCron,
    scheduleDescription,
    outputPath,
    emailRecipients,
    overwrite,
    xsltProcessor,
    stylePreset,
  };
}

function extractTags(identity: Element): readonly string[] {
  const tagsEl = findChild(identity, "Tags");
  if (!tagsEl) return [];

  const tagElements = findChildren(tagsEl, "Tag");
  return tagElements
    .map((el) => el.textContent?.trim() ?? "")
    .filter((t) => t.length > 0);
}

function extractScheduleEnabled(execution: Element | null): boolean {
  if (!execution) return false;
  const schedule = findChild(execution, "Schedule");
  if (!schedule) return false;
  return getChildText(schedule, "Enabled") === "true";
}

function extractScheduleCron(execution: Element | null): string {
  if (!execution) return "";
  const schedule = findChild(execution, "Schedule");
  if (!schedule) return "";
  return getChildText(schedule, "Cron");
}

function extractScheduleDescription(execution: Element | null): string {
  if (!execution) return "";
  const schedule = findChild(execution, "Schedule");
  if (!schedule) return "";
  return getChildText(schedule, "Description");
}

function extractOutputPath(execution: Element | null): string {
  if (!execution) return "";
  const distribution = findChild(execution, "Distribution");
  if (!distribution) return "";
  return getChildText(distribution, "OutputPath");
}

function extractEmailRecipients(execution: Element | null): string {
  if (!execution) return "";
  const distribution = findChild(execution, "Distribution");
  if (!distribution) return "";
  return getChildText(distribution, "EmailRecipients");
}

function extractOverwrite(execution: Element | null): boolean {
  if (!execution) return false;
  const distribution = findChild(execution, "Distribution");
  if (!distribution) return false;
  return getChildText(distribution, "OverwriteExisting") === "true";
}

function extractXsltProcessor(execution: Element | null): string {
  if (!execution) return "system-default";
  return getChildText(execution, "XSLTProcessor") || "system-default";
}

function extractColumns(root: Element): ColumnDefinition[] {
  const columnsSection = findSection(root, "Columns");
  if (!columnsSection) return [];

  const columnElements = findChildren(columnsSection, "Column");

  return columnElements.map((col, idx) => {
    const index = col.getAttribute("index");
    const header = getChildText(col, "Header");
    const xpath = getChildText(col, "XPath");
    const format = getChildText(col, "Format") as ColumnDefinition["format"];
    const align = getChildText(col, "Alignment") as ColumnDefinition["align"];
    const widthStr = getChildText(col, "Width");
    const width = widthStr ? parseInt(widthStr, 10) : 120;

    return {
      id: `col-${index ?? String(idx + 1)}`,
      xpath,
      header,
      format: isValidFormat(format) ? format : "auto",
      align: isValidAlign(align) ? align : "left",
      width: isNaN(width) ? 120 : width,
      fullPath: xpath,
    };
  });
}

function extractStyle(root: Element): Partial<StyleConfig> {
  const styleSection = findSection(root, "Style");
  if (!styleSection) return { ...DEFAULT_STYLE };

  const headerBg = getChildText(styleSection, "HeaderBackground");
  const headerFg = getChildText(styleSection, "HeaderForeground");
  const altRowBg = getChildText(styleSection, "AlternateRowBackground");
  const fontFamily = getChildText(styleSection, "FontFamily");
  const fontSize = getChildText(styleSection, "FontSize");
  const showTitle = getChildText(styleSection, "ShowTitle");
  const showFooter = getChildText(styleSection, "ShowFooter");
  const autoFilter = getChildText(styleSection, "AutoFilter");
  const orientation = getChildText(styleSection, "Orientation");
  const delimiter = getChildText(styleSection, "Delimiter");
  const quoteChar = getChildText(styleSection, "QuoteCharacter");
  const margins = getChildText(styleSection, "Margins");
  const preset = styleSection.getAttribute("preset");

  const orientationValue =
    orientation === "portrait" || orientation === "landscape"
      ? orientation
      : undefined;

  return {
    ...(headerBg ? { headerBg } : {}),
    ...(headerFg ? { headerFg } : {}),
    ...(altRowBg ? { altRowBg } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(fontSize ? { fontSize } : {}),
    ...(showTitle ? { showTitle: showTitle === "true" } : {}),
    ...(showFooter ? { showFooter: showFooter === "true" } : {}),
    ...(autoFilter ? { autoFilter: autoFilter === "true" } : {}),
    ...(orientationValue ? { orientation: orientationValue } : {}),
    ...(delimiter ? { delimiter } : {}),
    ...(quoteChar ? { quoteChar } : {}),
    ...(margins ? { margins } : {}),
    ...(preset ? { name: preset } : {}),
  };
}

function extractFormat(root: Element): ExportFormat {
  const output = findSection(root, "Output");
  if (!output) return "xlsx";

  // Try by format name first
  const formatName = getChildText(output, "Format").toLowerCase();
  if (formatName && formatName in FORMAT_NAME_MAP) {
    return FORMAT_NAME_MAP[formatName]!;
  }

  // Fall back to file extension
  const extension = getChildText(output, "FileExtension").toLowerCase();
  if (extension && extension in EXTENSION_TO_FORMAT) {
    return EXTENSION_TO_FORMAT[extension]!;
  }

  return "xlsx";
}

function extractRowSource(root: Element): string {
  const dataSource = findSection(root, "DataSource");
  if (!dataSource) return "//Slot";
  return getChildText(dataSource, "RowSourceXPath") || "//Slot";
}

function extractGroupBy(root: Element): string | null {
  const dataSource = findSection(root, "DataSource");
  if (!dataSource) return null;

  const groupByEl = findChild(dataSource, "GroupBy");
  if (!groupByEl) return null;

  return groupByEl.getAttribute("xpath") || null;
}

function extractSortBy(root: Element): SortConfig | null {
  const dataSource = findSection(root, "DataSource");
  if (!dataSource) return null;

  const sortByEl = findChild(dataSource, "SortBy");
  if (!sortByEl) return null;

  const field = sortByEl.getAttribute("xpath");
  const dir = sortByEl.getAttribute("direction");

  if (!field) return null;

  return {
    field,
    dir: dir === "desc" ? "desc" : "asc",
  };
}

const VALID_OPERATORS = new Set<FilterOperator>([
  "IN", "NOT_IN", "BETWEEN", "EQUALS", "NOT_EQUALS",
  "CONTAINS", "STARTS_WITH", "GREATER_THAN", "LESS_THAN",
  "IS_TRUE", "IS_FALSE",
]);

/**
 * Parses the `<Filters>` section from the report XML back into FilterValuesState.
 *
 * Expects the format produced by `buildFiltersSection` in filter-xml.ts:
 * ```xml
 * <Filters xmlns="urn:mediagenix:whatson:filter:v1">
 *   <Filter xpath="Channel/ChannelName" operator="IN">
 *     <Value>BBC One</Value>
 *   </Filter>
 *   <Filter xpath="Slot/SlotDate" operator="BETWEEN">
 *     <RangeStart>2025-01-01</RangeStart>
 *     <RangeEnd>2025-12-31</RangeEnd>
 *   </Filter>
 * </Filters>
 * ```
 */
function extractFilterValues(root: Element): FilterValuesState {
  // The <Filters> element may be a sibling of root or a child of the document
  // In our XML output, it's a top-level section alongside the structural tree
  const filtersSection = findSection(root, "Filters");
  if (!filtersSection) return {};

  const filterElements = findChildren(filtersSection, "Filter");
  const result: Record<string, FilterValue> = {};

  for (const filterEl of filterElements) {
    const xpath = filterEl.getAttribute("xpath")?.trim() ?? "";
    const operatorStr = filterEl.getAttribute("operator")?.trim() ?? "";

    if (!xpath || !VALID_OPERATORS.has(operatorStr as FilterOperator)) continue;

    const operator = operatorStr as FilterOperator;
    // Use xpath as nodeId since we don't have the original node ID in the XML
    const nodeId = xpath.replace(/\//g, "-");

    if (operator === "BETWEEN") {
      const rangeStart = getChildText(filterEl, "RangeStart") || undefined;
      const rangeEnd = getChildText(filterEl, "RangeEnd") || undefined;
      result[nodeId] = {
        xpath,
        nodeId,
        operator,
        values: [],
        rangeStart,
        rangeEnd,
        typeName: "",
      };
    } else if (operator === "IS_TRUE" || operator === "IS_FALSE") {
      result[nodeId] = {
        xpath,
        nodeId,
        operator,
        values: [],
        typeName: "boolean",
      };
    } else {
      const valueElements = findChildren(filterEl, "Value");
      const values = valueElements
        .map((el) => el.textContent?.trim() ?? "")
        .filter((v) => v.length > 0);
      result[nodeId] = {
        xpath,
        nodeId,
        operator,
        values,
        typeName: "",
      };
    }
  }

  return result;
}

// ─── DOM Helpers ────────────────────────────────────────────────────────

/**
 * Finds a top-level section element by local name, ignoring namespace.
 */
function findSection(root: Element, name: string): Element | null {
  // Try without namespace first
  const direct = findChild(root, name);
  if (direct) return direct;

  // Try with namespace
  for (const child of Array.from(root.children)) {
    if (child.localName === name) {
      return child;
    }
  }
  return null;
}

/**
 * Finds the first child element with the given local name.
 */
function findChild(parent: Element, name: string): Element | null {
  for (const child of Array.from(parent.children)) {
    if (child.localName === name) {
      return child;
    }
  }
  return null;
}

/**
 * Finds all child elements with the given local name.
 */
function findChildren(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter(
    (child) => child.localName === name,
  );
}

/**
 * Gets the text content of the first child element with the given name.
 */
function getChildText(parent: Element, name: string): string {
  const child = findChild(parent, name);
  return child?.textContent?.trim() ?? "";
}

// ─── Validation Helpers ─────────────────────────────────────────────────

const VALID_FORMATS = new Set(["auto", "text", "date", "datetime", "number"]);
const VALID_ALIGNS = new Set(["left", "center", "right"]);

function isValidFormat(value: string): value is ColumnDefinition["format"] {
  return VALID_FORMATS.has(value);
}

function isValidAlign(value: string): value is ColumnDefinition["align"] {
  return VALID_ALIGNS.has(value);
}

/**
 * Creates a default ParsedConfig for when parsing fails entirely.
 */
function createDefaultConfig(): ParsedConfig {
  return {
    metadata: { ...DEFAULT_METADATA },
    columns: [],
    style: { ...DEFAULT_STYLE },
    format: "xlsx",
    rowSource: "//Slot",
    groupBy: null,
    sortBy: null,
    filterValues: {},
  };
}
