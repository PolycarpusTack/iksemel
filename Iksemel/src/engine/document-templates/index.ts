/**
 * Document templates engine — barrel export.
 *
 * Re-exports all document template types, default scaffolds,
 * extractors, and store implementations from a single entry point.
 */

// Types
export type {
  DocumentTemplateStore,
  ExtractedSpreadsheetStyles,
  ExtractedDocumentStyles,
  ExtractedPresentationStyles,
  ParagraphStyleDef,
  TableStyleDef,
} from "./types";

// Default scaffolds
export {
  DEFAULT_XLSX_SCAFFOLD,
  DEFAULT_DOCX_SCAFFOLD,
  DEFAULT_PPTX_SCAFFOLD,
  DEFAULT_ODS_SCAFFOLD,
  DEFAULT_ODT_SCAFFOLD,
} from "./default-scaffolds";

// Extractors
export { extractDocumentTemplate } from "./extractor";
export { extractXlsxStyles } from "./xlsx-extractor";
export { extractDocxStyles } from "./docx-extractor";

// In-memory store
export { createDocumentTemplateMemoryStore } from "./memory-store";
