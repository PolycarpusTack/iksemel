/**
 * Error tracker implementation.
 *
 * Provides in-memory error report collection with a FIFO eviction policy.
 * Designed to be non-intrusive: never throws, never blocks the app.
 */

import type { ErrorReport, ErrorTracker, ErrorTrackerConfig } from "./types";

/** Default configuration values. */
const DEFAULT_CONFIG: ErrorTrackerConfig = {
  enabled: true,
  maxReports: 100,
};

/**
 * Creates an ErrorTracker instance.
 *
 * The tracker stores reports in memory using a FIFO strategy when the
 * maximum report limit is reached. Context key-value pairs set via
 * `setContext` are merged into every subsequent report.
 *
 * @param config - Partial configuration; unset fields use defaults.
 * @returns A fully initialised ErrorTracker.
 */
export function createErrorTracker(
  config?: Partial<ErrorTrackerConfig>,
): ErrorTracker {
  const resolved: ErrorTrackerConfig = { ...DEFAULT_CONFIG, ...config };
  const reports: ErrorReport[] = [];
  const context: Record<string, string> = {};

  function capture(error: ErrorReport): void {
    if (!resolved.enabled) return;

    try {
      const enriched: ErrorReport = {
        ...error,
        context: { ...context, ...error.context },
      };

      reports.push(enriched);

      // FIFO eviction when over the limit
      while (reports.length > resolved.maxReports) {
        reports.shift();
      }

      if (resolved.onReport) {
        resolved.onReport(enriched);
      }
    } catch {
      // Swallow — the tracker must never interfere with app operation.
    }
  }

  function captureException(
    err: unknown,
    source: ErrorReport["source"],
  ): void {
    if (!resolved.enabled) return;

    let message: string;
    let stack: string | undefined;

    if (err instanceof Error) {
      message = err.message;
      stack = err.stack;
    } else {
      message = String(err);
    }

    capture({ message, stack, source, timestamp: Date.now() });
  }

  function setContext(key: string, value: string): void {
    context[key] = value;
  }

  function getReports(): readonly ErrorReport[] {
    return [...reports];
  }

  function clear(): void {
    reports.length = 0;
  }

  return {
    capture,
    captureException,
    setContext,
    getReports,
    clear,
    get enabled() {
      return resolved.enabled;
    },
  };
}
