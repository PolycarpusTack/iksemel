/**
 * Tests for the analytics module.
 *
 * Covers createAnalyticsCollector and the NOOP_COLLECTOR singleton.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { createAnalyticsCollector } from "./collector";
import { NOOP_COLLECTOR } from "./noop-collector";
import type { AnalyticsCollector, AnalyticsEvent } from "./types";

// ─── Helpers ───────────────────────────────────────────────────────────

function makeEvent<T extends AnalyticsEvent["type"]>(
  type: T,
  extra?: Omit<Extract<AnalyticsEvent, { type: T }>, "type" | "timestamp">,
): Extract<AnalyticsEvent, { type: T }> {
  return {
    type,
    timestamp: Date.now(),
    ...extra,
  } as Extract<AnalyticsEvent, { type: T }>;
}

// ─── Collector ─────────────────────────────────────────────────────────

describe("createAnalyticsCollector", () => {
  let collector: AnalyticsCollector;

  beforeEach(() => {
    collector = createAnalyticsCollector({ batchSize: 100 });
  });

  it("tracks session_start event, increments session count", () => {
    collector.track(makeEvent("session_start"));
    expect(collector.getSummary().sessionCount).toBe(1);

    collector.track(makeEvent("session_start"));
    expect(collector.getSummary().sessionCount).toBe(2);
  });

  it("tracks session_end event, computes average duration", () => {
    collector.track(makeEvent("session_start"));
    collector.track(makeEvent("session_end", { durationMs: 1000 }));
    collector.track(makeEvent("session_start"));
    collector.track(makeEvent("session_end", { durationMs: 3000 }));

    const summary = collector.getSummary();
    // avgSessionDurationMs = totalSessionDurationMs / sessionCount
    // = (1000 + 3000) / 2 = 2000
    expect(summary.avgSessionDurationMs).toBe(2000);
  });

  it("tracks field_selected, updates frequency map", () => {
    collector.track(makeEvent("field_selected", { fieldPath: "Channel/Name" }));
    collector.track(makeEvent("field_selected", { fieldPath: "Channel/Name" }));
    collector.track(makeEvent("field_selected", { fieldPath: "Slot/Date" }));

    const summary = collector.getSummary();
    expect(summary.fieldSelectionFrequency["Channel/Name"]).toBe(2);
    expect(summary.fieldSelectionFrequency["Slot/Date"]).toBe(1);
  });

  it("tracks format_changed, updates format popularity", () => {
    collector.track(makeEvent("format_changed", { format: "xlsx" }));
    collector.track(makeEvent("format_changed", { format: "csv" }));
    collector.track(makeEvent("format_changed", { format: "xlsx" }));

    const summary = collector.getSummary();
    expect(summary.formatPopularity["xlsx"]).toBe(2);
    expect(summary.formatPopularity["csv"]).toBe(1);
  });

  it("tracks template_applied, updates template usage", () => {
    collector.track(
      makeEvent("template_applied", { templateId: "tpl-daily-schedule" }),
    );
    collector.track(
      makeEvent("template_applied", { templateId: "tpl-daily-schedule" }),
    );
    collector.track(
      makeEvent("template_applied", { templateId: "tpl-epg-delivery" }),
    );

    const summary = collector.getSummary();
    expect(summary.templateUsage["tpl-daily-schedule"]).toBe(2);
    expect(summary.templateUsage["tpl-epg-delivery"]).toBe(1);
  });

  it("tracks package_downloaded, increments total downloads", () => {
    collector.track(makeEvent("package_downloaded", { format: "xlsx" }));
    collector.track(makeEvent("package_downloaded", { format: "csv" }));

    const summary = collector.getSummary();
    expect(summary.totalDownloads).toBe(2);
    // package_downloaded also increments format popularity
    expect(summary.formatPopularity["xlsx"]).toBe(1);
  });

  it("tracks package_sent, increments total packages sent", () => {
    collector.track(makeEvent("package_sent"));
    collector.track(makeEvent("package_sent"));
    collector.track(makeEvent("package_sent"));

    expect(collector.getSummary().totalPackagesSent).toBe(3);
  });

  it("tracks tab_viewed, updates tab view frequency", () => {
    collector.track(makeEvent("tab_viewed", { tab: "fields" }));
    collector.track(makeEvent("tab_viewed", { tab: "fields" }));
    collector.track(makeEvent("tab_viewed", { tab: "preview" }));

    const summary = collector.getSummary();
    expect(summary.tabViewFrequency["fields"]).toBe(2);
    expect(summary.tabViewFrequency["preview"]).toBe(1);
  });

  it("tracks style_preset_changed, updates preset usage", () => {
    collector.track(
      makeEvent("style_preset_changed", { preset: "corporate" }),
    );
    collector.track(
      makeEvent("style_preset_changed", { preset: "broadcast" }),
    );
    collector.track(
      makeEvent("style_preset_changed", { preset: "corporate" }),
    );

    const summary = collector.getSummary();
    expect(summary.presetUsage["corporate"]).toBe(2);
    expect(summary.presetUsage["broadcast"]).toBe(1);
  });

  it("sampling: respects samplingRate 0.0 (tracks nothing)", () => {
    const sampled = createAnalyticsCollector({
      samplingRate: 0.0,
      batchSize: 100,
    });

    // Track many events - none should be recorded
    for (let i = 0; i < 100; i++) {
      sampled.track(makeEvent("session_start"));
    }

    expect(sampled.getSummary().sessionCount).toBe(0);
  });

  it("getSummary() reflects immediately after track()", () => {
    expect(collector.getSummary().sessionCount).toBe(0);
    collector.track(makeEvent("session_start"));
    expect(collector.getSummary().sessionCount).toBe(1);
  });

  it("flush() calls onFlush with buffered events", () => {
    const flushed: AnalyticsEvent[][] = [];
    const withFlush = createAnalyticsCollector({
      batchSize: 100,
      onFlush: (events) => {
        flushed.push([...events]);
      },
    });

    withFlush.track(makeEvent("session_start"));
    withFlush.track(makeEvent("session_start"));
    withFlush.flush();

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);
  });

  it("auto-flush when buffer reaches batchSize", () => {
    const flushed: AnalyticsEvent[][] = [];
    const autoBatch = createAnalyticsCollector({
      batchSize: 3,
      onFlush: (events) => {
        flushed.push([...events]);
      },
    });

    autoBatch.track(makeEvent("session_start"));
    autoBatch.track(makeEvent("session_start"));
    expect(flushed).toHaveLength(0);

    autoBatch.track(makeEvent("session_start")); // hits batchSize=3
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(3);
  });

  it("reset() clears all counters", () => {
    collector.track(makeEvent("session_start"));
    collector.track(makeEvent("package_downloaded", { format: "xlsx" }));
    collector.track(makeEvent("field_selected", { fieldPath: "A" }));

    collector.reset();

    const summary = collector.getSummary();
    expect(summary.sessionCount).toBe(0);
    expect(summary.totalDownloads).toBe(0);
    expect(summary.avgSessionDurationMs).toBe(0);
    expect(Object.keys(summary.fieldSelectionFrequency)).toHaveLength(0);
    expect(Object.keys(summary.formatPopularity)).toHaveLength(0);
  });

  it("disabled collector: track() is no-op", () => {
    const disabled = createAnalyticsCollector({ enabled: false });
    disabled.track(makeEvent("session_start"));
    expect(disabled.getSummary().sessionCount).toBe(0);
  });

  it("getSummary() returns zeroed summary when no events tracked", () => {
    const summary = collector.getSummary();
    expect(summary.sessionCount).toBe(0);
    expect(summary.avgSessionDurationMs).toBe(0);
    expect(summary.totalDownloads).toBe(0);
    expect(summary.totalPackagesSent).toBe(0);
    expect(Object.keys(summary.fieldSelectionFrequency)).toHaveLength(0);
    expect(Object.keys(summary.formatPopularity)).toHaveLength(0);
    expect(Object.keys(summary.templateUsage)).toHaveLength(0);
    expect(Object.keys(summary.presetUsage)).toHaveLength(0);
    expect(Object.keys(summary.tabViewFrequency)).toHaveLength(0);
  });
});

// ─── NOOP_COLLECTOR ────────────────────────────────────────────────────

describe("NOOP_COLLECTOR", () => {
  it("track() does not throw", () => {
    expect(() =>
      NOOP_COLLECTOR.track(makeEvent("session_start")),
    ).not.toThrow();
  });

  it("getSummary() returns empty summary", () => {
    const summary = NOOP_COLLECTOR.getSummary();
    expect(summary.sessionCount).toBe(0);
    expect(summary.avgSessionDurationMs).toBe(0);
    expect(summary.totalDownloads).toBe(0);
    expect(summary.totalPackagesSent).toBe(0);
    expect(Object.keys(summary.fieldSelectionFrequency)).toHaveLength(0);
  });

  it("enabled is false", () => {
    expect(NOOP_COLLECTOR.enabled).toBe(false);
  });

  it("flush() and reset() do not throw", () => {
    expect(() => NOOP_COLLECTOR.flush()).not.toThrow();
    expect(() => NOOP_COLLECTOR.reset()).not.toThrow();
  });
});
