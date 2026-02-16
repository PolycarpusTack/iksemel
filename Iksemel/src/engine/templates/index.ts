/**
 * Template library engine — barrel export.
 *
 * Re-exports all template types, constants, store implementations,
 * and serialization utilities from a single entry point.
 */

// Types
export type {
  TemplateSpec,
  TemplateCategory,
  TemplateConfig,
  TemplateColumnDef,
  TemplateStore,
} from "./types";

// Standard built-in templates
export { STANDARD_TEMPLATES } from "./standard-templates";

// In-memory store
export { createMemoryStore } from "./memory-store";

// Serialization & state conversion
export {
  serializeTemplate,
  deserializeTemplate,
  stateToTemplate,
  templateToState,
  TemplateValidationError,
} from "./template-serializer";
export type {
  StateToTemplateOptions,
  TemplateApplyResult,
} from "./template-serializer";
