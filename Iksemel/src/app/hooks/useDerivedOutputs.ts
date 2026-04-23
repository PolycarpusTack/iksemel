import { useMemo } from "react";
import {
  deriveAnalysisOutputs,
  deriveGenerationOutputs,
  type AnalysisOutputs,
  type DerivedOutputs,
  type DerivedOutputsInput,
  type DerivedPerformanceMetrics,
  type GenerationOutputs,
} from "./derived-outputs-core";

export type {
  DerivedOutputs,
  DerivedOutputsInput,
  DerivedPerformanceMetrics,
} from "./derived-outputs-core";
export { deriveOutputs } from "./derived-outputs-core";

export function useDerivedOutputs(input: DerivedOutputsInput): DerivedOutputs {
  const analysis: AnalysisOutputs = useMemo(
    () => deriveAnalysisOutputs(input),
    [input.schema, input.selection, input.searchQuery, input.columns],
  );

  const generation: GenerationOutputs = useMemo(
    () => deriveGenerationOutputs(input, analysis),
    [
      input.schema,
      input.selection,
      input.filterValues,
      input.columns,
      input.format,
      input.rowSource,
      input.style,
      input.groupBy,
      input.sortBy,
      input.title,
      input.metadata,
      input.documentTemplate,
      analysis.selectedCount,
      analysis.totalCount,
      analysis.reductionPct,
    ],
  );

  const perf: DerivedPerformanceMetrics = useMemo(
    () => ({
      analysisMs: analysis.analysisMs,
      generationMs: generation.generationMs,
      totalMs: analysis.analysisMs + generation.generationMs,
    }),
    [analysis.analysisMs, generation.generationMs],
  );

  return useMemo(() => ({
    ...analysis,
    ...generation,
    perf,
  }), [analysis, generation, perf]);
}
