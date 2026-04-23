/**
 * Tests for the template library module.
 *
 * Covers standard templates, MemoryStore, and template serialization /
 * state conversion utilities.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { STANDARD_TEMPLATES } from "./standard-templates";
import { createMemoryStore } from "./memory-store";
import {
  serializeTemplate,
  deserializeTemplate,
  TemplateValidationError,
  stateToTemplate,
  templateToState,
} from "./template-serializer";
import type { TemplateSpec, TemplateStore } from "./types";
import type {
  ColumnDefinition,
  SelectionState,
} from "@/types";
import { TEST_STYLE as testStyle, TEST_METADATA as testMetadata } from "@/test/fixtures";

// ─── Test helpers ──────────────────────────────────────────────────────

const testColumns: ColumnDefinition[] = [
  { id: "c1", xpath: "SlotDate", header: "Date", format: "date", align: "left", width: 120, fullPath: "Slot/SlotDate" },
  { id: "c2", xpath: "Programme/Title", header: "Title", format: "text", align: "left", width: 200, fullPath: "Slot/Programme/Title" },
];

// ─── Standard Templates ────────────────────────────────────────────────

describe("Standard Templates", () => {
  it("provides exactly 5 standard templates", () => {
    expect(STANDARD_TEMPLATES).toHaveLength(5);
  });

  it("each template is a valid TemplateSpec object", () => {
    for (const tpl of STANDARD_TEMPLATES) {
      expect(tpl).toHaveProperty("schemaVersion");
      expect(tpl).toHaveProperty("id");
      expect(tpl).toHaveProperty("name");
      expect(tpl).toHaveProperty("config");
      expect(tpl.config).toHaveProperty("columns");
      expect(tpl.config).toHaveProperty("format");
    }
  });

  it('each template has schemaVersion "1.0"', () => {
    for (const tpl of STANDARD_TEMPLATES) {
      expect(tpl.schemaVersion).toBe("1.0");
    }
  });

  it('each template has a unique ID starting with "tpl-"', () => {
    const ids = STANDARD_TEMPLATES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^tpl-/);
    }
  });

  it("each template has non-empty name, description, category", () => {
    for (const tpl of STANDARD_TEMPLATES) {
      expect(tpl.name.length).toBeGreaterThan(0);
      expect(tpl.description.length).toBeGreaterThan(0);
      expect(tpl.category.length).toBeGreaterThan(0);
    }
  });

  it("each template has a valid format (xlsx, csv, word, html)", () => {
    const validFormats = ["xlsx", "csv", "word", "html"];
    for (const tpl of STANDARD_TEMPLATES) {
      expect(validFormats).toContain(tpl.config.format);
    }
  });

  it("each template has at least 1 column definition", () => {
    for (const tpl of STANDARD_TEMPLATES) {
      expect(tpl.config.columns.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Daily Schedule template has groupBy "Channel/Name"', () => {
    const schedule = STANDARD_TEMPLATES.find(
      (t) => t.id === "tpl-daily-schedule",
    )!;
    expect(schedule.config.groupBy).toBe("Channel/Name");
  });

  it("Compliance Report template has sortBy desc", () => {
    const compliance = STANDARD_TEMPLATES.find(
      (t) => t.id === "tpl-compliance-report",
    )!;
    expect(compliance.config.sortBy).not.toBeNull();
    expect(compliance.config.sortBy!.dir).toBe("desc");
  });

  it('Commercial Breaks template format is "csv"', () => {
    const commercial = STANDARD_TEMPLATES.find(
      (t) => t.id === "tpl-commercial-breaks",
    )!;
    expect(commercial.config.format).toBe("csv");
  });
});

// ─── MemoryStore ───────────────────────────────────────────────────────

describe("MemoryStore", () => {
  let store: TemplateStore;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("listTemplates() returns 5 standard templates", async () => {
    const templates = await store.listTemplates();
    expect(templates).toHaveLength(5);
  });

  it("getTemplate() returns specific template by ID", async () => {
    const tpl = await store.getTemplate("tpl-daily-schedule");
    expect(tpl).not.toBeNull();
    expect(tpl!.name).toBe("Daily Schedule");
  });

  it("getTemplate() returns null for unknown ID", async () => {
    const tpl = await store.getTemplate("tpl-nonexistent");
    expect(tpl).toBeNull();
  });

  it("saveTemplate() adds new template", async () => {
    const newTemplate: TemplateSpec = {
      ...STANDARD_TEMPLATES[0]!,
      id: "tpl-custom-1",
      name: "Custom Template",
    };
    await store.saveTemplate(newTemplate);

    const templates = await store.listTemplates();
    expect(templates).toHaveLength(6);

    const saved = await store.getTemplate("tpl-custom-1");
    expect(saved).not.toBeNull();
    expect(saved!.name).toBe("Custom Template");
  });

  it("saveTemplate() updates existing template", async () => {
    const updated: TemplateSpec = {
      ...STANDARD_TEMPLATES[0]!,
      id: "tpl-daily-schedule",
      name: "Updated Schedule",
    };
    await store.saveTemplate(updated);

    const templates = await store.listTemplates();
    expect(templates).toHaveLength(5); // same count

    const saved = await store.getTemplate("tpl-daily-schedule");
    expect(saved!.name).toBe("Updated Schedule");
  });

  it("deleteTemplate() removes template", async () => {
    const result = await store.deleteTemplate("tpl-daily-schedule");
    expect(result).toBe(true);

    const templates = await store.listTemplates();
    expect(templates).toHaveLength(4);

    const deleted = await store.getTemplate("tpl-daily-schedule");
    expect(deleted).toBeNull();
  });

  it("deleteTemplate() returns false for unknown ID", async () => {
    const result = await store.deleteTemplate("tpl-nonexistent");
    expect(result).toBe(false);
  });
});

// ─── Template Serializer ───────────────────────────────────────────────

describe("Template Serializer", () => {
  describe("serializeTemplate / deserializeTemplate", () => {
    it("serializeTemplate() produces valid JSON", () => {
      const tpl = STANDARD_TEMPLATES[0]!;
      const json = serializeTemplate(tpl);
      expect(() => {
        JSON.parse(json);
      }).not.toThrow();
    });

    it("deserializeTemplate() round-trips correctly", () => {
      const original = STANDARD_TEMPLATES[0]!;
      const json = serializeTemplate(original);
      const restored = deserializeTemplate(json);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.schemaVersion).toBe(original.schemaVersion);
      expect(restored.config.format).toBe(original.config.format);
      expect(restored.config.columns).toHaveLength(
        original.config.columns.length,
      );
    });

    it("deserializeTemplate() throws on invalid JSON", () => {
      expect(() => deserializeTemplate("not json")).toThrow(
        TemplateValidationError,
      );
    });

    it("deserializeTemplate() throws on missing required fields", () => {
      const invalid = JSON.stringify({ schemaVersion: "1.0" });
      expect(() => deserializeTemplate(invalid)).toThrow(
        TemplateValidationError,
      );
    });

    it("deserializeTemplate() throws on unsupported schema version", () => {
      const tpl = { ...STANDARD_TEMPLATES[0]!, schemaVersion: "2.0" };
      const json = JSON.stringify(tpl);
      expect(() => deserializeTemplate(json)).toThrow(
        TemplateValidationError,
      );
    });

    it("deserializeTemplate() preserves unknown fields", () => {
      const original = STANDARD_TEMPLATES[0]!;
      const withExtra = { ...original, customField: "hello" };
      const json = JSON.stringify(withExtra);
      const restored = deserializeTemplate(json);
      expect((restored as Record<string, unknown>)["customField"]).toBe(
        "hello",
      );
    });

    it("round-trips template with native format (xlsx-native)", () => {
      const original = STANDARD_TEMPLATES[0]!;
      const withNativeFormat = { ...original, config: { ...original.config, format: "xlsx-native" } };
      const json = serializeTemplate(withNativeFormat);
      const restored = deserializeTemplate(json);

      expect(restored.config.format).toBe("xlsx-native");
      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
    });
  });

  describe("stateToTemplate", () => {
    it("creates a valid template from state", () => {
      const selection: SelectionState = {
        "Slot/SlotDate": true,
        "Programme/Title": true,
        "Channel/Name": false,
      };

      const tpl = stateToTemplate({
        name: "My Report",
        description: "Test description",
        category: "schedule",
        author: "Tester",
        selection,
        columns: testColumns,
        format: "xlsx",
        rowSource: "//Slot",
        stylePreset: "corporate",
        style: testStyle,
        groupBy: null,
        sortBy: null,
        metadata: testMetadata,
      });

      expect(tpl.schemaVersion).toBe("1.0");
      expect(tpl.name).toBe("My Report");
      expect(tpl.config.format).toBe("xlsx");
      expect(tpl.config.columns).toHaveLength(2);
    });

    it("generates unique IDs", () => {
      const selection: SelectionState = { "Slot/Date": true };
      const opts = {
        name: "A",
        description: "D",
        category: "schedule" as const,
        author: "T",
        selection,
        columns: testColumns,
        format: "xlsx" as const,
        rowSource: "//Slot",
        stylePreset: "corporate",
        style: testStyle,
        groupBy: null,
        sortBy: null,
        metadata: testMetadata,
      };

      const t1 = stateToTemplate(opts);
      const t2 = stateToTemplate(opts);

      expect(t1.id).not.toBe(t2.id);
      expect(t1.id).toMatch(/^tpl-/);
      expect(t2.id).toMatch(/^tpl-/);
    });

    it("derives fieldPatterns from selected keys in selection state", () => {
      const selection: SelectionState = {
        "Slot/SlotDate": true,
        "Programme/Title": true,
        "Channel/Name": false,
      };

      const tpl = stateToTemplate({
        name: "Test",
        description: "D",
        category: "schedule",
        author: "T",
        selection,
        columns: testColumns,
        format: "xlsx",
        rowSource: "//Slot",
        stylePreset: "corporate",
        style: testStyle,
        groupBy: null,
        sortBy: null,
        metadata: testMetadata,
      });

      // Only true entries should appear in fieldPatterns
      expect(tpl.config.fieldPatterns).toContain("Slot/SlotDate");
      expect(tpl.config.fieldPatterns).toContain("Programme/Title");
      expect(tpl.config.fieldPatterns).not.toContain("Channel/Name");
    });
  });

  describe("templateToState", () => {
    it("extracts columns correctly", () => {
      const tpl = STANDARD_TEMPLATES[0]!; // Daily Schedule
      const result = templateToState(tpl);

      expect(result.columns).toHaveLength(tpl.config.columns.length);
      expect(result.columns[0]!.header).toBe(tpl.config.columns[0]!.header);
      expect(result.columns[0]!.xpath).toBe(tpl.config.columns[0]!.xpath);
      // Synthesized id and fullPath from xpath
      expect(result.columns[0]!.id).toBe(tpl.config.columns[0]!.xpath);
      expect(result.columns[0]!.fullPath).toBe(tpl.config.columns[0]!.xpath);
    });

    it("preserves format and rowSource", () => {
      const tpl = STANDARD_TEMPLATES[0]!; // Daily Schedule: xlsx
      const result = templateToState(tpl);

      expect(result.format).toBe("xlsx");
      expect(result.rowSource).toBe("//Slot");
    });

    it("returns style overrides", () => {
      const tpl = STANDARD_TEMPLATES[0]!;
      const result = templateToState(tpl);

      expect(result.style).toBeDefined();
      expect(result.stylePresetKey).toBe(tpl.config.stylePreset);
    });

    it("preserves groupBy", () => {
      const schedule = STANDARD_TEMPLATES.find(
        (t) => t.id === "tpl-daily-schedule",
      )!;
      const result = templateToState(schedule);
      expect(result.groupBy).toBe("Channel/Name");
    });

    it("preserves sortBy", () => {
      const compliance = STANDARD_TEMPLATES.find(
        (t) => t.id === "tpl-compliance-report",
      )!;
      const result = templateToState(compliance);
      expect(result.sortBy).toEqual({ field: "BroadcastDate", dir: "desc" });
    });

    it("preserves metadata", () => {
      const tpl = STANDARD_TEMPLATES[0]!;
      const result = templateToState(tpl);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.name).toBe("Daily Schedule");
    });
  });
});
