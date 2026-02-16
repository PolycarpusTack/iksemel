/**
 * In-memory TemplateStore implementation.
 *
 * Pre-loaded with the standard built-in templates. Suitable for development,
 * testing, and as a baseline before persistence is wired up (localStorage,
 * IndexedDB, or server-side storage).
 */

import type { TemplateSpec, TemplateStore } from "./types";
import { STANDARD_TEMPLATES } from "./standard-templates";

/**
 * Creates an in-memory template store pre-loaded with the standard templates.
 *
 * Each instance maintains its own independent copy of the template map,
 * so mutations in one store do not affect another.
 */
export function createMemoryStore(): TemplateStore {
  // Deep-copy the standard templates so callers cannot mutate the originals.
  const templates = new Map<string, TemplateSpec>(
    STANDARD_TEMPLATES.map((t) => [t.id, structuredClone(t)]),
  );

  return {
    async listTemplates(): Promise<readonly TemplateSpec[]> {
      return [...templates.values()];
    },

    async getTemplate(id: string): Promise<TemplateSpec | null> {
      return templates.get(id) ?? null;
    },

    async saveTemplate(template: TemplateSpec): Promise<void> {
      // Store a defensive copy to prevent external mutation.
      templates.set(template.id, structuredClone(template));
    },

    async deleteTemplate(id: string): Promise<boolean> {
      return templates.delete(id);
    },
  };
}
