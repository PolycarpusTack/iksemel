/**
 * Anonymous analytics collector.
 *
 * Tracks aggregated usage metrics without collecting PII.
 * Events are buffered for batch flushing and immediately aggregated
 * into a running summary so getSummary() is always up-to-date.
 *
 * Individual events are discarded after aggregation — only aggregate
 * counters and averages are retained.
 */

import type {
  AnalyticsCollector,
  AnalyticsConfig,
  AnalyticsEvent,
  AnalyticsSummary,
} from "./types";

/** Default configuration values. */
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  samplingRate: 1.0,
  batchSize: 50,
  flushIntervalMs: 0,
};

/** Mutable internal state for the summary counters. */
interface MutableSummary {
  sessionCount: number;
  totalSessionDurationMs: number;
  fieldSelectionFrequency: Record<string, number>;
  formatPopularity: Record<string, number>;
  templateUsage: Record<string, number>;
  presetUsage: Record<string, number>;
  tabViewFrequency: Record<string, number>;
  totalDownloads: number;
  totalPackagesSent: number;
}

/** Creates a fresh mutable summary with zeroed counters. */
function createEmptySummary(): MutableSummary {
  return {
    sessionCount: 0,
    totalSessionDurationMs: 0,
    fieldSelectionFrequency: {},
    formatPopularity: {},
    templateUsage: {},
    presetUsage: {},
    tabViewFrequency: {},
    totalDownloads: 0,
    totalPackagesSent: 0,
  };
}

/** Increments a key in a frequency map, initializing to 0 if absent. */
function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

/** Converts the mutable internal summary to the readonly public shape. */
function toReadonlySummary(s: MutableSummary): AnalyticsSummary {
  return {
    sessionCount: s.sessionCount,
    avgSessionDurationMs:
      s.sessionCount > 0 ? s.totalSessionDurationMs / s.sessionCount : 0,
    fieldSelectionFrequency: { ...s.fieldSelectionFrequency },
    formatPopularity: { ...s.formatPopularity },
    templateUsage: { ...s.templateUsage },
    presetUsage: { ...s.presetUsage },
    tabViewFrequency: { ...s.tabViewFrequency },
    totalDownloads: s.totalDownloads,
    totalPackagesSent: s.totalPackagesSent,
  };
}

/**
 * Updates the mutable summary counters for a single event.
 * This is the core aggregation logic — called immediately on track().
 */
function aggregateEvent(summary: MutableSummary, event: AnalyticsEvent): void {
  switch (event.type) {
    case "session_start":
      summary.sessionCount++;
      break;
    case "session_end":
      summary.totalSessionDurationMs += event.durationMs;
      break;
    case "schema_loaded":
      // Field count is informational; no counter to update.
      break;
    case "field_selected":
      increment(summary.fieldSelectionFrequency, event.fieldPath);
      break;
    case "field_deselected":
      // Deselection is tracked as a negative signal; we don't decrement.
      break;
    case "format_changed":
      increment(summary.formatPopularity, event.format);
      break;
    case "template_applied":
      increment(summary.templateUsage, event.templateId);
      break;
    case "template_saved":
      // Category is informational for the event; no separate counter.
      break;
    case "package_downloaded":
      summary.totalDownloads++;
      increment(summary.formatPopularity, event.format);
      break;
    case "package_sent":
      summary.totalPackagesSent++;
      break;
    case "style_preset_changed":
      increment(summary.presetUsage, event.preset);
      break;
    case "tab_viewed":
      increment(summary.tabViewFrequency, event.tab);
      break;
  }
}

/**
 * Creates an analytics collector with the given (partial) configuration.
 *
 * The collector immediately aggregates each tracked event into running
 * summary counters AND buffers the event for the onFlush callback.
 * When the buffer reaches `batchSize`, or when `flush()` is called
 * manually, buffered events are passed to `onFlush` and discarded.
 *
 * @param config - Partial configuration; unspecified fields use defaults.
 * @returns A fully initialized AnalyticsCollector.
 */
export function createAnalyticsCollector(
  config?: Partial<AnalyticsConfig>,
): AnalyticsCollector {
  const resolved: AnalyticsConfig = { ...DEFAULT_CONFIG, ...config };
  let summary = createEmptySummary();
  let buffer: AnalyticsEvent[] = [];
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  /** Flushes the event buffer, calling onFlush if configured. */
  function flush(): void {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    resolved.onFlush?.(batch);
  }

  /** Starts the periodic flush timer if configured. */
  function startTimer(): void {
    if (resolved.flushIntervalMs > 0 && flushTimer === null) {
      flushTimer = setInterval(flush, resolved.flushIntervalMs);
    }
  }

  /** Stops the periodic flush timer. */
  function stopTimer(): void {
    if (flushTimer !== null) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  }

  // Start the periodic flush timer on creation if configured.
  startTimer();

  return {
    get enabled(): boolean {
      return resolved.enabled;
    },

    track(event: AnalyticsEvent): void {
      if (!resolved.enabled) return;

      // Apply sampling: skip event if random value exceeds rate.
      if (resolved.samplingRate < 1.0 && Math.random() >= resolved.samplingRate) {
        return;
      }

      // Immediately aggregate into the running summary.
      aggregateEvent(summary, event);

      // Buffer the event for the onFlush callback.
      buffer.push(event);

      // Auto-flush when buffer reaches batch size.
      if (buffer.length >= resolved.batchSize) {
        flush();
      }
    },

    getSummary(): AnalyticsSummary {
      return toReadonlySummary(summary);
    },

    flush,

    reset(): void {
      stopTimer();
      summary = createEmptySummary();
      buffer = [];
      startTimer();
    },

    destroy(): void {
      flush();
      stopTimer();
    },
  };
}
