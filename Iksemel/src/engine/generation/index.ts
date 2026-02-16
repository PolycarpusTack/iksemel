/**
 * Generation module barrel export.
 *
 * Re-exports all generation functionality:
 * - Filter XML generation
 * - XSLT generator registry and format-specific generators
 * - Post-processor registry and format-specific post-processors
 * - Report definition generation
 * - OOXML/ODF shared utilities
 *
 * Importing this module auto-registers all format generators with the registry.
 */

// --- Filter XML ---
export { generateFilterXml } from "./filter-xml";
export type { FilterXmlOptions } from "./filter-xml";

// --- XSLT Registry ---
export {
  registerGenerator,
  getGenerator,
  generateXslt,
  getRegisteredFormats,
  clearRegistry,
} from "./xslt-registry";
export type { XsltGeneratorFn } from "./xslt-registry";

// --- Format generators (import triggers auto-registration) ---
export { generateExcelXslt } from "./xslt-excel";
export { generateCsvXslt } from "./xslt-csv";
export { generateWordXslt } from "./xslt-word";
export { generateHtmlXslt } from "./xslt-html";
export { generateXlsxNativeXslt } from "./xslt-xlsx-native";
export { generateDocxNativeXslt } from "./xslt-docx-native";
export { generatePptxNativeXslt } from "./xslt-pptx-native";
export { generateOdsNativeXslt } from "./xslt-ods-native";
export { generateOdtNativeXslt } from "./xslt-odt-native";

// --- Post-processor Registry ---
export {
  registerPostProcessor,
  getPostProcessor,
  hasPostProcessor,
  clearPostProcessorRegistry,
} from "./post-processor-registry";
export type {
  PostProcessResult,
  PostProcessInput,
  PostProcessorFn,
} from "./post-processor-registry";

// --- Post-processors (import triggers auto-registration) ---
export { postProcessXlsx } from "./post-processor-xlsx";
export { postProcessDocx } from "./post-processor-docx";
export { postProcessPptx } from "./post-processor-pptx";
export { postProcessOds } from "./post-processor-ods";
export { postProcessOdt } from "./post-processor-odt";

// --- OOXML Shared Utilities ---
export {
  columnIndexToLetter,
  cellRef,
  NS_SPREADSHEETML,
  NS_RELATIONSHIPS,
  NS_WORDPROCESSINGML,
  NS_PRESENTATIONML,
  NS_DRAWINGML,
  NS_XFEB_FRAGMENT,
  NS_XFEB_DOCUMENT_FRAGMENT,
  NS_XFEB_SLIDE_FRAGMENT,
  SPREADSHEET_CELL_TYPES,
  DEFAULT_STYLE_INDICES,
} from "./xslt-ooxml-shared";

// --- ODF Shared Utilities ---
export {
  NS_OFFICE,
  NS_TABLE,
  NS_TEXT,
  NS_STYLE,
  NS_FO,
  NS_XFEB_ODF_FRAGMENT,
} from "./xslt-odf-shared";

// --- Report Definition ---
export { generateReportDefinition } from "./report-definition";
export type { ReportDefinitionInput } from "./report-definition";
