/**
 * Post-processor registry for native document format generation.
 *
 * Maps ExportFormat values to post-processor functions that merge
 * XSLT-generated XML fragments into document template scaffolds
 * and produce final ZIP packages.
 */

import type { ExportFormat, DocumentTemplate } from "@/types";

/**
 * Result of post-processing: a complete document ZIP package.
 */
export interface PostProcessResult {
  readonly data: Uint8Array;
  readonly mimeType: string;
  readonly extension: string;
}

/**
 * Input to a post-processor function.
 */
export interface PostProcessInput {
  readonly xsltOutput: string;
  readonly template: DocumentTemplate;
  readonly title: string;
  readonly author: string;
}

/**
 * A function that merges an XSLT output fragment into a document
 * template scaffold and produces a ZIP package.
 */
export type PostProcessorFn = (input: PostProcessInput) => Promise<PostProcessResult>;

/**
 * Internal registry mapping export formats to their post-processor functions.
 */
const registry = new Map<ExportFormat, PostProcessorFn>();

/**
 * Registers a post-processor function for the given export format.
 */
export function registerPostProcessor(
  format: ExportFormat,
  processor: PostProcessorFn,
): void {
  registry.set(format, processor);
}

/**
 * Retrieves the post-processor function for the given export format.
 */
export function getPostProcessor(format: ExportFormat): PostProcessorFn | undefined {
  return registry.get(format);
}

/**
 * Checks whether a post-processor is registered for the given format.
 */
export function hasPostProcessor(format: ExportFormat): boolean {
  return registry.has(format);
}

/**
 * Removes all registered post-processors. Primarily useful for testing.
 */
export function clearPostProcessorRegistry(): void {
  registry.clear();
}
