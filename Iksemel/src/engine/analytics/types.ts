/**
 * Anonymous analytics event types.
 * All events are aggregated — no PII is collected.
 */
export type AnalyticsEvent =
  | { readonly type: "session_start"; readonly timestamp: number }
  | { readonly type: "session_end"; readonly timestamp: number; readonly durationMs: number }
  | { readonly type: "schema_loaded"; readonly timestamp: number; readonly fieldCount: number }
  | { readonly type: "field_selected"; readonly timestamp: number; readonly fieldPath: string }
  | { readonly type: "field_deselected"; readonly timestamp: number; readonly fieldPath: string }
  | { readonly type: "format_changed"; readonly timestamp: number; readonly format: string }
  | { readonly type: "template_applied"; readonly timestamp: number; readonly templateId: string }
  | { readonly type: "template_saved"; readonly timestamp: number; readonly category: string }
  | { readonly type: "package_downloaded"; readonly timestamp: number; readonly format: string }
  | { readonly type: "package_sent"; readonly timestamp: number }
  | { readonly type: "style_preset_changed"; readonly timestamp: number; readonly preset: string }
  | { readonly type: "tab_viewed"; readonly timestamp: number; readonly tab: string };

/**
 * Aggregated analytics summary.
 * All data is aggregated — individual events are not stored.
 */
export interface AnalyticsSummary {
  /** Total sessions tracked */
  readonly sessionCount: number;
  /** Average session duration in ms */
  readonly avgSessionDurationMs: number;
  /** Field selection frequency: path -> count */
  readonly fieldSelectionFrequency: Readonly<Record<string, number>>;
  /** Format popularity: format -> count */
  readonly formatPopularity: Readonly<Record<string, number>>;
  /** Template usage: templateId -> count */
  readonly templateUsage: Readonly<Record<string, number>>;
  /** Style preset usage: preset -> count */
  readonly presetUsage: Readonly<Record<string, number>>;
  /** Tab view frequency: tab -> count */
  readonly tabViewFrequency: Readonly<Record<string, number>>;
  /** Total packages downloaded */
  readonly totalDownloads: number;
  /** Total packages sent via bridge */
  readonly totalPackagesSent: number;
}

/**
 * Analytics collector configuration.
 */
export interface AnalyticsConfig {
  /** Whether analytics is enabled */
  readonly enabled: boolean;
  /** Sampling rate (0.0 to 1.0) — 1.0 means track everything */
  readonly samplingRate: number;
  /** Maximum events to buffer before flushing */
  readonly batchSize: number;
  /** Flush interval in ms (0 = manual flush only) */
  readonly flushIntervalMs: number;
  /** Callback when a batch is flushed (for future API integration) */
  readonly onFlush?: (events: readonly AnalyticsEvent[]) => void;
}

/**
 * Analytics collector interface.
 */
export interface AnalyticsCollector {
  /** Record an analytics event */
  track(event: AnalyticsEvent): void;
  /** Get current aggregated summary */
  getSummary(): AnalyticsSummary;
  /** Flush buffered events */
  flush(): void;
  /** Reset all data */
  reset(): void;
  /** Stop the flush timer and flush remaining events. */
  destroy(): void;
  /** Check if analytics is enabled */
  readonly enabled: boolean;
}
