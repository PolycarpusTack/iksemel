/**
 * Template library types for the XFEB engine.
 *
 * Templates are portable, versioned snapshots of XFEB configuration state.
 * They capture field selections, column layouts, styling, and export settings
 * so users can apply predefined or custom report configurations with one click.
 */

import type {
  ExportFormat,
  StyleConfig,
  SortConfig,
  ReportMetadata,
} from "@/types";

// ─── Template Specification ────────────────────────────────────────────

/**
 * Template specification — a portable, versioned snapshot of XFEB state.
 * Forward-compatible: unknown fields are preserved, not rejected.
 */
export interface TemplateSpec {
  /** Schema version for forward compatibility */
  readonly schemaVersion: "1.0";
  /** Unique template ID */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Description */
  readonly description: string;
  /** Category for filtering */
  readonly category: TemplateCategory;
  /** Tags for search */
  readonly tags: readonly string[];
  /** ISO 8601 creation date */
  readonly createdAt: string;
  /** ISO 8601 last modified date */
  readonly updatedAt: string;
  /** Author name */
  readonly author: string;
  /** Thumbnail description (for generating preview) */
  readonly thumbnail: string;

  /** Template configuration payload */
  readonly config: TemplateConfig;

  /** Forward-compatibility: preserved unknown fields */
  readonly [key: string]: unknown;
}

/**
 * Categories used to organise templates in the library UI.
 */
export type TemplateCategory =
  | "schedule"
  | "epg"
  | "rights"
  | "compliance"
  | "commercial"
  | "custom";

// ─── Template Configuration ────────────────────────────────────────────

/**
 * Template configuration — the actual state to restore.
 */
export interface TemplateConfig {
  /** Selected field paths (not IDs, since IDs are schema-specific) */
  readonly fieldPatterns: readonly string[];
  /** Column definitions */
  readonly columns: readonly TemplateColumnDef[];
  /** Export format */
  readonly format: ExportFormat;
  /** Row source XPath pattern */
  readonly rowSource: string;
  /** Style preset key */
  readonly stylePreset: string;
  /** Style overrides */
  readonly styleOverrides: Partial<StyleConfig>;
  /** Group by XPath */
  readonly groupBy: string | null;
  /** Sort configuration */
  readonly sortBy: SortConfig | null;
  /** Report metadata defaults */
  readonly metadata: Partial<ReportMetadata>;
}

/**
 * Column definition within a template.
 * Uses XPath patterns rather than node IDs for portability across schemas.
 */
export interface TemplateColumnDef {
  readonly xpath: string;
  readonly header: string;
  readonly format: "auto" | "text" | "date" | "datetime" | "number";
  readonly align: "left" | "center" | "right";
  readonly width: number;
}

// ─── Template Store ────────────────────────────────────────────────────

/**
 * Template storage abstraction.
 * Implementations may back onto memory, localStorage, IndexedDB, or a server.
 */
export interface TemplateStore {
  /** List all available templates. */
  listTemplates(): Promise<readonly TemplateSpec[]>;
  /** Retrieve a single template by ID, or null if not found. */
  getTemplate(id: string): Promise<TemplateSpec | null>;
  /** Save (create or update) a template. */
  saveTemplate(template: TemplateSpec): Promise<void>;
  /** Delete a template by ID. Returns true if it existed. */
  deleteTemplate(id: string): Promise<boolean>;
}
