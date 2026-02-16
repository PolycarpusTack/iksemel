/**
 * Pluggable XSLT generator registry.
 *
 * Maps ExportFormat values to generator functions, enabling format-specific
 * XSLT generation through a single dispatch point. New formats can be
 * registered at runtime without modifying existing generators.
 */

import type { ExportFormat, GeneratorInput } from "@/types";

/**
 * A generator function that produces an XSLT stylesheet string
 * from a GeneratorInput configuration.
 */
export type XsltGeneratorFn = (input: GeneratorInput) => string;

/**
 * Internal registry mapping export formats to their generator functions.
 */
const registry = new Map<ExportFormat, XsltGeneratorFn>();

/**
 * Registers a generator function for the given export format.
 * Replaces any previously registered generator for the same format.
 *
 * @param format - The export format key
 * @param generator - The generator function to register
 *
 * @example
 * ```ts
 * registerGenerator("xlsx", generateExcelXslt);
 * registerGenerator("csv", generateCsvXslt);
 * ```
 */
export function registerGenerator(
  format: ExportFormat,
  generator: XsltGeneratorFn,
): void {
  registry.set(format, generator);
}

/**
 * Retrieves the generator function for the given export format.
 *
 * @param format - The export format key
 * @returns The registered generator, or undefined if none registered
 */
export function getGenerator(format: ExportFormat): XsltGeneratorFn | undefined {
  return registry.get(format);
}

/**
 * Generates an XSLT stylesheet by dispatching to the registered generator
 * for the input's format. Throws if no generator is registered.
 *
 * @param input - The generator input configuration
 * @returns The generated XSLT stylesheet string
 * @throws Error if no generator is registered for the format
 *
 * @example
 * ```ts
 * const xslt = generateXslt({
 *   format: "xlsx",
 *   columns: [...],
 *   rowSource: "//Slot",
 *   style: { ... },
 *   groupBy: null,
 *   sortBy: null,
 *   title: "My Report",
 * });
 * ```
 */
export function generateXslt(input: GeneratorInput): string {
  const generator = registry.get(input.format);
  if (!generator) {
    throw new Error(
      `No XSLT generator registered for format "${input.format}". ` +
        `Registered formats: ${[...registry.keys()].join(", ") || "(none)"}`,
    );
  }
  return generator(input);
}

/**
 * Returns all currently registered export formats.
 */
export function getRegisteredFormats(): readonly ExportFormat[] {
  return [...registry.keys()];
}

/**
 * Removes all registered generators. Primarily useful for testing.
 */
export function clearRegistry(): void {
  registry.clear();
}
