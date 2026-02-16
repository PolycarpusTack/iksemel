/**
 * No-op analytics collector.
 *
 * Satisfies the AnalyticsCollector interface but performs no work.
 * Used when analytics is disabled — all methods are safe no-ops.
 */

import type { AnalyticsCollector, AnalyticsSummary } from "./types";

/** Empty summary returned by the no-op collector. */
const EMPTY_SUMMARY: AnalyticsSummary = {
  sessionCount: 0,
  avgSessionDurationMs: 0,
  fieldSelectionFrequency: {},
  formatPopularity: {},
  templateUsage: {},
  presetUsage: {},
  tabViewFrequency: {},
  totalDownloads: 0,
  totalPackagesSent: 0,
};

/**
 * A no-op analytics collector that does nothing.
 * All methods are safe to call but have no effect.
 */
export const NOOP_COLLECTOR: AnalyticsCollector = {
  track: () => {},
  getSummary: () => EMPTY_SUMMARY,
  flush: () => {},
  reset: () => {},
  destroy: () => {},
  enabled: false,
};
