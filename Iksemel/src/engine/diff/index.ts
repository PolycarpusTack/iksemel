/**
 * Enhanced configuration diff engine.
 *
 * Barrel export for all diff types and functions.
 */

export type {
  DiffChange,
  DiffSummary,
  ConfigDiffResult,
  ConfigSnapshot,
} from "./types";

export { diffConfigs } from "./diff-engine";

export { applyChange, applySelectedChanges } from "./diff-apply";
