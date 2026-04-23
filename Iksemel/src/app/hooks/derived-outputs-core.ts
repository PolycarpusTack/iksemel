import {
  countAll,
  countSelected,
  getSelectedLeaves,
  getRepeatingElements,
} from "@engine/selection";
import {
  computeReduction,
  estimateTotalSize,
  estimateSelectedSize,
  detectPayloadExplosions,
  searchSchema,
  validateFilterCompleteness,
} from "@engine/analysis";
import { generateFilterXml } from "@engine/generation/filter-xml";
import { generateXslt } from "@engine/generation/xslt-registry";
import { generateReportDefinition } from "@engine/generation/report-definition";
import type { ReportDefinitionInput } from "@engine/generation/report-definition";
import type { AppState } from "@/state";
import type { GeneratorInput } from "@/types";

export interface DerivedPerformanceMetrics {
  readonly analysisMs: number;
  readonly generationMs: number;
  readonly totalMs: number;
}

export interface DerivedOutputs {
  readonly totalCount: number;
  readonly selectedCount: number;
  readonly reductionPct: number;
  readonly rawXmlSize: number;
  readonly reportSize: number;
  readonly payloadExplosions: ReturnType<typeof detectPayloadExplosions>;
  readonly searchMatchCount: number | null;
  readonly validationWarnings: ReturnType<typeof validateFilterCompleteness>;
  readonly selectedLeaves: ReturnType<typeof getSelectedLeaves>;
  readonly repeatingElements: ReturnType<typeof getRepeatingElements>;
  readonly orphanedColumns: AppState["columns"];
  readonly filterXml: string;
  readonly xsltOutput: string;
  readonly reportXml: string;
  readonly slug: string;
  readonly perf: DerivedPerformanceMetrics;
}

export type DerivedOutputsInput = Pick<
  AppState,
  | "schema"
  | "selection"
  | "searchQuery"
  | "columns"
  | "format"
  | "rowSource"
  | "style"
  | "groupBy"
  | "sortBy"
  | "title"
  | "metadata"
  | "documentTemplate"
  | "filterValues"
>;

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export interface AnalysisOutputs {
  readonly totalCount: number;
  readonly selectedCount: number;
  readonly reductionPct: number;
  readonly rawXmlSize: number;
  readonly reportSize: number;
  readonly payloadExplosions: ReturnType<typeof detectPayloadExplosions>;
  readonly searchMatchCount: number | null;
  readonly validationWarnings: ReturnType<typeof validateFilterCompleteness>;
  readonly selectedLeaves: ReturnType<typeof getSelectedLeaves>;
  readonly repeatingElements: ReturnType<typeof getRepeatingElements>;
  readonly orphanedColumns: AppState["columns"];
  readonly analysisMs: number;
}

export function deriveAnalysisOutputs(input: DerivedOutputsInput): AnalysisOutputs {
  const start = nowMs();
  const totalCount = input.schema ? countAll(input.schema) : 0;
  const selectedCount = input.schema ? countSelected(input.schema, input.selection) : 0;
  const reductionPct = input.schema ? computeReduction(input.schema, input.selection) : 0;
  const rawXmlSize = input.schema ? estimateTotalSize(input.schema) : 0;
  const reportSize = input.schema ? estimateSelectedSize(input.schema, input.selection) : 0;
  const payloadExplosions = input.schema ? detectPayloadExplosions(input.schema, input.selection) : [];
  const searchMatchCount = input.schema && input.searchQuery.trim()
    ? searchSchema(input.schema, input.searchQuery).length
    : null;
  const validationWarnings = input.schema ? validateFilterCompleteness(input.schema, input.selection) : [];
  const selectedLeaves = input.schema ? getSelectedLeaves(input.schema, input.selection) : [];
  const repeatingElements = input.schema ? getRepeatingElements(input.schema) : [];

  const orphanedColumns = (() => {
    if (input.columns.length === 0 || selectedLeaves.length === 0) {
      return [];
    }
    const selectedLeafXpaths = new Set(selectedLeaves.map((leaf) => leaf.xpath));
    return input.columns.filter((col) => !selectedLeafXpaths.has(col.xpath));
  })();

  return {
    totalCount,
    selectedCount,
    reductionPct,
    rawXmlSize,
    reportSize,
    payloadExplosions,
    searchMatchCount,
    validationWarnings,
    selectedLeaves,
    repeatingElements,
    orphanedColumns,
    analysisMs: nowMs() - start,
  };
}

export interface GenerationOutputs {
  readonly filterXml: string;
  readonly xsltOutput: string;
  readonly reportXml: string;
  readonly slug: string;
  readonly generationMs: number;
}

export function deriveGenerationOutputs(
  input: DerivedOutputsInput,
  analysis: Pick<AnalysisOutputs, "selectedCount" | "totalCount" | "reductionPct">,
): GenerationOutputs {
  const start = nowMs();
  const generatorInput: GeneratorInput = {
    format: input.format,
    columns: input.columns,
    rowSource: input.rowSource,
    style: input.style,
    groupBy: input.groupBy,
    sortBy: input.sortBy,
    title: input.title || input.metadata.name || "Export",
    documentTemplate: input.documentTemplate ?? null,
  };

  const filterXml = input.schema
    ? generateFilterXml(input.schema, input.selection, { filterValues: input.filterValues })
    : "";

  let xsltOutput = "";
  if (input.columns.length > 0) {
    try {
      xsltOutput = generateXslt(generatorInput);
    } catch {
      xsltOutput = "<!-- Error generating XSLT -->";
    }
  }

  let reportXml = "";
  if (input.metadata.name) {
    try {
      const reportInput: ReportDefinitionInput = {
        metadata: input.metadata,
        columns: input.columns,
        style: input.style,
        format: input.format,
        rowSource: input.rowSource,
        groupBy: input.groupBy,
        sortBy: input.sortBy,
        filterFieldCount: analysis.selectedCount,
        totalFieldCount: analysis.totalCount,
        reductionPct: analysis.reductionPct,
      };
      reportXml = generateReportDefinition(reportInput);
    } catch {
      reportXml = "<!-- Error generating report definition -->";
    }
  }

  const slug = (input.title || input.metadata.name || "export")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    filterXml,
    xsltOutput,
    reportXml,
    slug,
    generationMs: nowMs() - start,
  };
}

export function deriveOutputs(input: DerivedOutputsInput): DerivedOutputs {
  const totalStart = nowMs();
  const analysis = deriveAnalysisOutputs(input);
  const generation = deriveGenerationOutputs(input, analysis);

  return {
    ...analysis,
    ...generation,
    perf: {
      analysisMs: analysis.analysisMs,
      generationMs: generation.generationMs,
      totalMs: nowMs() - totalStart,
    },
  };
}
