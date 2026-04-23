import type { DerivedPerformanceMetrics } from "@/app/hooks/useDerivedOutputs";
import { benchmarkZipBackends } from "@engine/package";
import type { PackageZipEntry, ZipBenchmarkResult } from "@engine/package";

export interface PerfSample {
  readonly timestamp: string;
  readonly metrics: DerivedPerformanceMetrics;
}

const MAX_SAMPLES = 200;
const samples: PerfSample[] = [];
const renderCounts = new Map<string, number>();

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

export function recordPerfSample(metrics: DerivedPerformanceMetrics): void {
  samples.push({
    timestamp: new Date().toISOString(),
    metrics,
  });

  while (samples.length > MAX_SAMPLES) {
    samples.shift();
  }

  exposeTelemetryApi();
}

export function getPerfSamples(): readonly PerfSample[] {
  return [...samples];
}

export function clearPerfSamples(): void {
  samples.length = 0;
}

export function recordRender(componentName: string): void {
  const count = renderCounts.get(componentName) ?? 0;
  renderCounts.set(componentName, count + 1);
  exposeTelemetryApi();
}

export function getRenderCounts(): Readonly<Record<string, number>> {
  return Object.freeze(Object.fromEntries(renderCounts.entries()));
}

export function clearRenderCounts(): void {
  renderCounts.clear();
}

export async function runZipBenchmark(entries: readonly PackageZipEntry[]): Promise<readonly ZipBenchmarkResult[]> {
  return benchmarkZipBackends(entries);
}

export function getPerfSummary(): {
  readonly count: number;
  readonly totalMsAvg: number;
  readonly totalMsP95: number;
  readonly generationMsAvg: number;
  readonly analysisMsAvg: number;
} {
  const totals = samples.map((s) => s.metrics.totalMs);
  const generations = samples.map((s) => s.metrics.generationMs);
  const analyses = samples.map((s) => s.metrics.analysisMs);

  const avg = (values: readonly number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  return {
    count: samples.length,
    totalMsAvg: avg(totals),
    totalMsP95: percentile(totals, 95),
    generationMsAvg: avg(generations),
    analysisMsAvg: avg(analyses),
  };
}

function exposeTelemetryApi(): void {
  if (typeof window === "undefined") {
    return;
  }

  const target = window as Window & {
    __XFEB_PERF__?: {
      getSamples: typeof getPerfSamples;
      getSummary: typeof getPerfSummary;
      clear: typeof clearPerfSamples;
      getRenders: typeof getRenderCounts;
      clearRenders: typeof clearRenderCounts;
      benchmarkZip: typeof runZipBenchmark;
    };
  };

  if (!target.__XFEB_PERF__) {
    target.__XFEB_PERF__ = {
      getSamples: getPerfSamples,
      getSummary: getPerfSummary,
      clear: clearPerfSamples,
      getRenders: getRenderCounts,
      clearRenders: clearRenderCounts,
      benchmarkZip: runZipBenchmark,
    };
  }
}
