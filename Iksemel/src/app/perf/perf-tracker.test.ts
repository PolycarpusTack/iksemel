import { describe, expect, it, beforeEach } from "vitest";
import {
  clearRenderCounts,
  clearPerfSamples,
  getRenderCounts,
  getPerfSamples,
  getPerfSummary,
  runZipBenchmark,
  recordRender,
  recordPerfSample,
} from "./perf-tracker";

describe("perf-tracker", () => {
  beforeEach(() => {
    clearPerfSamples();
    clearRenderCounts();
  });

  it("records samples and computes summary stats", () => {
    recordPerfSample({ analysisMs: 4, generationMs: 8, totalMs: 12 });
    recordPerfSample({ analysisMs: 6, generationMs: 10, totalMs: 16 });

    const summary = getPerfSummary();
    expect(summary.count).toBe(2);
    expect(summary.analysisMsAvg).toBe(5);
    expect(summary.generationMsAvg).toBe(9);
    expect(summary.totalMsAvg).toBe(14);
    expect(summary.totalMsP95).toBe(16);
    expect(getPerfSamples()).toHaveLength(2);
  });

  it("records and clears render counters", () => {
    recordRender("LeftPanel");
    recordRender("LeftPanel");
    recordRender("RightTabs");

    expect(getRenderCounts()).toEqual({
      LeftPanel: 2,
      RightTabs: 1,
    });

    clearRenderCounts();
    expect(getRenderCounts()).toEqual({});
  });

  it("runs zip backend benchmark", async () => {
    const results = await runZipBenchmark([
      { path: "a.xml", content: "<a/>" },
      { path: "b.xml", content: "<b/>" },
    ]);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.backend).toBeTruthy();
  });
});
