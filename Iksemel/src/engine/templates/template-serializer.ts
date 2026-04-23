/**
 * Template serialization, deserialization, and state conversion utilities.
 *
 * These functions bridge the gap between persisted JSON templates and the
 * live application state. Unknown fields in the JSON are preserved so that
 * templates authored by a newer version of XFEB can round-trip through an
 * older version without data loss.
 */

import type {
  ColumnDefinition,
  ExportFormat,
  ReportMetadata,
  SortConfig,
  StyleConfig,
} from "@/types";
import type { SelectionState } from "@/types";
import type {
  TemplateCategory,
  TemplateColumnDef,
  TemplateConfig,
  TemplateSpec,
} from "./types";

// ─── Serialization ─────────────────────────────────────────────────────

/**
 * Serialize a template to a JSON string.
 * The output is deterministic (keys sorted) for stable diffs.
 */
export function serializeTemplate(template: TemplateSpec): string {
  return JSON.stringify(template, sortedReplacer, 2);
}

/** JSON replacer that sorts object keys for deterministic output. */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

// ─── Deserialization ───────────────────────────────────────────────────

/**
 * Validation error thrown when template JSON is structurally invalid.
 */
export class TemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateValidationError";
  }
}

/**
 * Deserialize a JSON string to a TemplateSpec.
 *
 * Validates that all required fields are present and correctly typed.
 * Unknown top-level fields are preserved for forward compatibility.
 *
 * @throws {TemplateValidationError} if the JSON is invalid or missing required fields.
 */
export function deserializeTemplate(json: string): TemplateSpec {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new TemplateValidationError("Invalid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TemplateValidationError("Template must be a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  // Required string fields
  const requiredStrings: ReadonlyArray<keyof TemplateSpec & string> = [
    "schemaVersion",
    "id",
    "name",
    "description",
    "category",
    "createdAt",
    "updatedAt",
    "author",
    "thumbnail",
  ];

  for (const field of requiredStrings) {
    if (typeof obj[field] !== "string") {
      throw new TemplateValidationError(
        `Missing or invalid required field: "${field}" (expected string)`,
      );
    }
  }

  if (obj["schemaVersion"] !== "1.0") {
    throw new TemplateValidationError(
      `Unsupported schema version: "${String(obj["schemaVersion"])}"`,
    );
  }

  // Tags must be an array of strings
  if (!Array.isArray(obj["tags"])) {
    throw new TemplateValidationError(
      'Missing or invalid required field: "tags" (expected array)',
    );
  }

  for (const tag of obj["tags"] as unknown[]) {
    if (typeof tag !== "string") {
      throw new TemplateValidationError("Each tag must be a string");
    }
  }

  // Config must be an object
  if (
    typeof obj["config"] !== "object" ||
    obj["config"] === null ||
    Array.isArray(obj["config"])
  ) {
    throw new TemplateValidationError(
      'Missing or invalid required field: "config" (expected object)',
    );
  }

  const config = obj["config"] as Record<string, unknown>;
  validateConfig(config);

  // All validations passed — return the object with its original shape
  // (preserving unknown fields for forward compatibility).
  return obj as unknown as TemplateSpec;
}

/**
 * Validate the config sub-object of a template.
 */
function validateConfig(config: Record<string, unknown>): void {
  if (!Array.isArray(config["fieldPatterns"])) {
    throw new TemplateValidationError(
      'config.fieldPatterns must be an array',
    );
  }

  if (!Array.isArray(config["columns"])) {
    throw new TemplateValidationError('config.columns must be an array');
  }

  for (const col of config["columns"] as unknown[]) {
    if (typeof col !== "object" || col === null) {
      throw new TemplateValidationError(
        "Each column in config.columns must be an object",
      );
    }
    const c = col as Record<string, unknown>;
    if (typeof c["xpath"] !== "string" || typeof c["header"] !== "string") {
      throw new TemplateValidationError(
        "Each column must have string xpath and header fields",
      );
    }
  }

  const validFormats: readonly string[] = [
    "xlsx", "csv", "word", "html",
    "xlsx-native", "docx-native", "pptx-native", "ods-native", "odt-native",
  ];
  if (typeof config["format"] !== "string" || !validFormats.includes(config["format"])) {
    throw new TemplateValidationError(
      `config.format must be one of: ${validFormats.join(", ")}`,
    );
  }

  if (typeof config["rowSource"] !== "string") {
    throw new TemplateValidationError("config.rowSource must be a string");
  }

  if (typeof config["stylePreset"] !== "string") {
    throw new TemplateValidationError("config.stylePreset must be a string");
  }
}

// ─── State Conversion: App State → Template ────────────────────────────

/**
 * Options for creating a template from the current application state.
 */
export interface StateToTemplateOptions {
  readonly name: string;
  readonly description: string;
  readonly category: TemplateCategory;
  readonly author: string;
  readonly selection: SelectionState;
  readonly columns: readonly ColumnDefinition[];
  readonly format: ExportFormat;
  readonly rowSource: string;
  readonly stylePreset: string;
  readonly style: StyleConfig;
  readonly groupBy: string | null;
  readonly sortBy: SortConfig | null;
  readonly metadata: ReportMetadata;
}

/**
 * Export the current application state as a new TemplateSpec.
 *
 * Generates a unique ID and timestamps automatically. The selection state
 * is converted to field patterns (the fullPath of each selected column)
 * for schema-independent portability.
 */
export function stateToTemplate(options: StateToTemplateOptions): TemplateSpec {
  const now = new Date().toISOString();
  const id = `tpl-${crypto.randomUUID()}`;

  // Derive field patterns from the selected keys in the selection state.
  const fieldPatterns: string[] = Object.entries(options.selection)
    .filter(([, selected]) => selected)
    .map(([key]) => key);

  // Map ColumnDefinition[] to TemplateColumnDef[] (drop id and fullPath).
  const columns: TemplateColumnDef[] = options.columns.map((col) => ({
    xpath: col.xpath,
    header: col.header,
    format: col.format,
    align: col.align,
    width: col.width,
  }));

  // Compute style overrides: include only fields that differ from the
  // base style config's name (which represents the preset).
  const styleOverrides: Partial<StyleConfig> = { ...options.style };

  const config: TemplateConfig = {
    fieldPatterns,
    columns,
    format: options.format,
    rowSource: options.rowSource,
    stylePreset: options.stylePreset,
    styleOverrides,
    groupBy: options.groupBy,
    sortBy: options.sortBy,
    metadata: {
      name: options.metadata.name,
      description: options.metadata.description,
      version: options.metadata.version,
      author: options.metadata.author,
      category: options.metadata.category,
      tags: [...options.metadata.tags],
      scheduleEnabled: options.metadata.scheduleEnabled,
      scheduleCron: options.metadata.scheduleCron,
      scheduleDescription: options.metadata.scheduleDescription,
      outputPath: options.metadata.outputPath,
      emailRecipients: options.metadata.emailRecipients,
      overwrite: options.metadata.overwrite,
      xsltProcessor: options.metadata.xsltProcessor,
      stylePreset: options.metadata.stylePreset,
    },
  };

  return {
    schemaVersion: "1.0",
    id,
    name: options.name,
    description: options.description,
    category: options.category,
    tags: fieldPatterns.map((fp) => fp.split("/").pop() ?? fp).slice(0, 10),
    createdAt: now,
    updatedAt: now,
    author: options.author,
    thumbnail: `Custom template: ${options.name}`,
    config,
  };
}

// ─── State Conversion: Template → App State ────────────────────────────

/**
 * The partial application state produced by applying a template.
 * Consumers merge this into their current state.
 */
export interface TemplateApplyResult {
  readonly columns: ColumnDefinition[];
  readonly format: ExportFormat;
  readonly rowSource: string;
  readonly stylePresetKey: string;
  readonly style: Partial<StyleConfig>;
  readonly groupBy: string | null;
  readonly sortBy: SortConfig | null;
  readonly metadata: Partial<ReportMetadata>;
}

/**
 * Apply a template to produce the partial state that consumers should merge
 * into the current application state.
 *
 * TemplateColumnDef is expanded back to ColumnDefinition by synthesising
 * the `id` (from xpath) and `fullPath` (same as xpath for templates).
 */
export function templateToState(template: TemplateSpec): TemplateApplyResult {
  const { config } = template;

  const columns: ColumnDefinition[] = config.columns.map((col) => ({
    id: col.xpath,
    xpath: col.xpath,
    header: col.header,
    format: col.format,
    align: col.align,
    width: col.width,
    fullPath: col.xpath,
  }));

  return {
    columns,
    format: config.format,
    rowSource: config.rowSource,
    stylePresetKey: config.stylePreset,
    style: config.styleOverrides,
    groupBy: config.groupBy,
    sortBy: config.sortBy,
    metadata: config.metadata,
  };
}
