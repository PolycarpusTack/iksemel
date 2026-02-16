/**
 * In-memory DocumentTemplateStore implementation.
 *
 * Follows the pattern from engine/templates/memory-store.ts:
 * uses structuredClone for defensive copies.
 */

import type { DocumentTemplate } from "@/types";
import type { DocumentTemplateStore } from "./types";

/**
 * Creates an in-memory document template store.
 * Each instance maintains its own independent Map.
 */
export function createDocumentTemplateMemoryStore(): DocumentTemplateStore {
  const templates = new Map<string, DocumentTemplate>();

  return {
    listTemplates(): Promise<readonly DocumentTemplate[]> {
      return Promise.resolve([...templates.values()]);
    },

    getTemplate(id: string): Promise<DocumentTemplate | null> {
      return Promise.resolve(templates.get(id) ?? null);
    },

    saveTemplate(template: DocumentTemplate): Promise<void> {
      templates.set(template.id, structuredClone(template));
      return Promise.resolve();
    },

    deleteTemplate(id: string): Promise<boolean> {
      return Promise.resolve(templates.delete(id));
    },
  };
}
