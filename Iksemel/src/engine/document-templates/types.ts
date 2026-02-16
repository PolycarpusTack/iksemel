/**
 * Document template type system for native format generation.
 *
 * These types define the structure of uploaded document templates,
 * extracted styles, and the storage abstraction for managing templates.
 */

import type {
  DocumentTemplate,
  DocumentTemplateFormat,
  TemplateZipEntry,
  ExtractedStyles,
} from "@/types";

// Re-export the core types from the canonical location
export type {
  DocumentTemplate,
  DocumentTemplateFormat,
  TemplateZipEntry,
  ExtractedStyles,
};

/**
 * Spreadsheet-specific extracted styles (extends base ExtractedStyles).
 */
export interface ExtractedSpreadsheetStyles extends ExtractedStyles {
  readonly type: "spreadsheet";
}

/**
 * Document-specific extracted styles.
 */
export interface ExtractedDocumentStyles extends ExtractedStyles {
  readonly type: "document";
  readonly paragraphStyles: readonly ParagraphStyleDef[];
  readonly tableStyles: readonly TableStyleDef[];
  readonly defaultFont: string;
  readonly pageWidth: number;
  readonly pageHeight: number;
}

/**
 * Presentation-specific extracted styles.
 */
export interface ExtractedPresentationStyles extends ExtractedStyles {
  readonly type: "presentation";
  readonly slideMasterCount: number;
  readonly slideWidth: number;
  readonly slideHeight: number;
}

export interface ParagraphStyleDef {
  readonly id: string;
  readonly name: string;
  readonly fontName: string;
  readonly fontSize: number;
  readonly bold: boolean;
  readonly italic: boolean;
}

export interface TableStyleDef {
  readonly id: string;
  readonly name: string;
}

/**
 * Async CRUD interface for document template persistence.
 * Mirrors the existing TemplateStore pattern from engine/templates/types.ts.
 */
export interface DocumentTemplateStore {
  listTemplates(): Promise<readonly DocumentTemplate[]>;
  getTemplate(id: string): Promise<DocumentTemplate | null>;
  saveTemplate(template: DocumentTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<boolean>;
}
