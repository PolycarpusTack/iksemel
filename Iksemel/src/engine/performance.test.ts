/**
 * Performance regression tests.
 *
 * Each test measures wall-clock time for a deterministic workload and
 * asserts it stays below a budget. Where the operation involves the
 * jsdom DOMParser (which is ~3-6x slower than a real browser), the
 * budget is multiplied by JSDOM_OVERHEAD.
 */

import { describe, it, expect } from "vitest";
import { parseXSD } from "./parser/parse-xsd";
import { toggleNode, selectAll, countSelected } from "./selection";
import { generateFilterXml } from "./generation/filter-xml";
import { generateExcelXslt } from "./generation/xslt-excel";
import { generateReportDefinition } from "./generation/report-definition";
import type { ReportDefinitionInput } from "./generation/report-definition";
import {
  serializeTemplate,
  deserializeTemplate,
  templateToState,
} from "./templates/template-serializer";
import { diffConfigs } from "./diff/diff-engine";
import type { ConfigSnapshot } from "./diff/types";
import type {
  SchemaNode,
  SelectionState,
  GeneratorInput,
  ColumnDefinition,
} from "@/types";
import type { TemplateSpec } from "./templates/types";
import { xsd, TEST_STYLE as testStyle, TEST_METADATA as testMetadata } from "@/test/fixtures";

// ─── Constants ──────────────────────────────────────────────────────────

/**
 * jsdom DOMParser is ~3-6x slower than the browser. This multiplier
 * is applied to budgets for operations that touch DOMParser.
 */
const JSDOM_OVERHEAD = 6;

// ─── Helpers ────────────────────────────────────────────────────────────

/** Generate a valid XSD with N simple elements under a single root. */
function generateXSD(elementCount: number): string {
  const elements = Array.from(
    { length: elementCount },
    (_, i) => `<xs:element name="Field${i}" type="xs:string"/>`,
  ).join("");
  return xsd(`
    <xs:element name="Root">
      <xs:complexType><xs:sequence>${elements}</xs:sequence></xs:complexType>
    </xs:element>
  `);
}

/** Build a SchemaNode tree with N leaves under one root (no DOM needed). */
function buildTree(leafCount: number): SchemaNode {
  const children: SchemaNode[] = Array.from(
    { length: leafCount },
    (_, i): SchemaNode => ({
      id: `leaf-${i}`,
      name: `Field${i}`,
      documentation: "",
      minOccurs: "1",
      maxOccurs: "1",
      type: "simple",
      typeName: "string",
      children: [],
      isRequired: true,
    }),
  );

  return {
    id: "root",
    name: "Root",
    documentation: "",
    minOccurs: "1",
    maxOccurs: "1",
    type: "complex",
    typeName: "",
    children,
    isRequired: true,
  };
}

/** Build a selection state where every leaf is selected. */
function selectAllLeaves(root: SchemaNode): SelectionState {
  const sel: Record<string, boolean> = { [root.id]: true };
  for (const child of root.children) {
    sel[child.id] = true;
  }
  return sel;
}

function makeColumns(count: number): ColumnDefinition[] {
  return Array.from(
    { length: count },
    (_, i): ColumnDefinition => ({
      id: `col-${i}`,
      xpath: `Field${i}`,
      header: `Header ${i}`,
      format: "text",
      align: "left",
      width: 120,
      fullPath: `Root/Field${i}`,
    }),
  );
}

function makeGeneratorInput(
  columns: ColumnDefinition[],
  overrides: Partial<GeneratorInput> = {},
): GeneratorInput {
  return {
    format: "xlsx",
    columns,
    rowSource: "//Root",
    style: testStyle,
    groupBy: null,
    sortBy: null,
    title: "Perf Test",
    documentTemplate: null,
    ...overrides,
  };
}

function makeSnapshot(fieldCount: number): ConfigSnapshot {
  const selection: Record<string, boolean> = {};
  for (let i = 0; i < fieldCount; i++) {
    selection[`field-${i}`] = true;
  }
  return {
    selection,
    columns: makeColumns(Math.min(fieldCount, 20)),
    format: "xlsx",
    rowSource: "//Slot",
    style: testStyle,
    groupBy: null,
    sortBy: null,
    metadata: testMetadata,
  };
}

function makeTemplate(): TemplateSpec {
  return {
    schemaVersion: "1.0",
    id: "tpl-perf-test",
    name: "Perf Test Template",
    description: "Template for perf testing",
    category: "schedule",
    tags: ["perf", "test"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: "Tester",
    thumbnail: "Perf test template",
    config: {
      fieldPatterns: Array.from({ length: 20 }, (_, i) => `Root/Field${i}`),
      columns: Array.from({ length: 10 }, (_, i) => ({
        xpath: `Field${i}`,
        header: `Header ${i}`,
        format: "text" as const,
        align: "left" as const,
        width: 120,
      })),
      format: "xlsx",
      rowSource: "//Root",
      stylePreset: "corporate",
      styleOverrides: {},
      groupBy: null,
      sortBy: null,
      metadata: {
        name: "Perf Test Report",
      },
    },
  };
}

// ─── Schema Parsing Performance ─────────────────────────────────────────

describe("Schema parsing performance", () => {
  it("parses 100-element XSD within 200ms (adjusted for jsdom)", () => {
    const schema = generateXSD(100);
    const start = performance.now();
    parseXSD(schema);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200 * JSDOM_OVERHEAD);
  });

  it("parses 500-element XSD within 1000ms (adjusted for jsdom)", () => {
    const schema = generateXSD(500);
    const start = performance.now();
    parseXSD(schema);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000 * JSDOM_OVERHEAD);
  });

  it("parses 1000-element XSD within 2500ms (adjusted for jsdom)", () => {
    const schema = generateXSD(1000);
    const start = performance.now();
    parseXSD(schema);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2500 * JSDOM_OVERHEAD);
  });
});

// ─── Selection Operations Performance ───────────────────────────────────

describe("Selection operations performance", () => {
  it("toggles a node in a 100-element tree within 5ms", () => {
    const root = buildTree(100);
    const roots = [root];
    const sel: SelectionState = {};

    const start = performance.now();
    toggleNode(root.children[50]!, roots, sel);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
  });

  it("selects all in a 500-element tree within 20ms", () => {
    const root = buildTree(500);
    const roots = [root];

    const start = performance.now();
    const sel = selectAll(roots);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(20);
    expect(countSelected(roots, sel)).toBe(501);
  });

  it("computes reduction in a 1000-element tree within 50ms", () => {
    const root = buildTree(1000);
    const roots = [root];
    // Select roughly half the leaves
    const sel: Record<string, boolean> = { root: true };
    for (let i = 0; i < 500; i++) {
      sel[`leaf-${i}`] = true;
    }

    const start = performance.now();
    const totalCount = 1001; // root + 1000 leaves
    const selectedCount = countSelected(roots, sel);
    const reductionPct = Math.round(
      ((totalCount - selectedCount) / totalCount) * 100,
    );
    expect(reductionPct).toBeGreaterThan(0);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });
});

// ─── Generation Performance ─────────────────────────────────────────────

describe("Generation performance", () => {
  it("generates filter XML for 100 selected fields within 50ms", () => {
    const root = buildTree(100);
    const roots = [root];
    const sel = selectAllLeaves(root);

    const start = performance.now();
    generateFilterXml(roots, sel);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });

  it("generates XSLT with 20 columns within 100ms", () => {
    const columns = makeColumns(20);
    const input = makeGeneratorInput(columns);

    const start = performance.now();
    generateExcelXslt(input);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it("generates report definition within 50ms", () => {
    const columns = makeColumns(15);
    const input: ReportDefinitionInput = {
      metadata: testMetadata,
      columns,
      style: testStyle,
      format: "xlsx",
      rowSource: "//Slot",
      groupBy: null,
      sortBy: null,
      filterFieldCount: 15,
      totalFieldCount: 100,
      reductionPct: 85,
    };

    const start = performance.now();
    generateReportDefinition(input);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });
});

// ─── Template Operations Performance ────────────────────────────────────

describe("Template operations performance", () => {
  it("serializes and deserializes a template round-trip within 10ms", () => {
    const template = makeTemplate();

    const start = performance.now();
    const json = serializeTemplate(template);
    deserializeTemplate(json);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it("applies a template to state within 5ms", () => {
    const template = makeTemplate();

    const start = performance.now();
    templateToState(template);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
  });
});

// ─── Diff Operations Performance ────────────────────────────────────────

describe("Diff operations performance", () => {
  it("diffs two configs with 100 field changes within 50ms", () => {
    const before = makeSnapshot(100);

    // Create "after" with every field changed
    const afterSelection: Record<string, boolean> = {};
    for (let i = 100; i < 200; i++) {
      afterSelection[`field-${i}`] = true;
    }
    const after: ConfigSnapshot = {
      ...before,
      selection: afterSelection,
    };

    const start = performance.now();
    const result = diffConfigs(before, after);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
    expect(result.changes.length).toBeGreaterThan(0);
  });

  it("diffs identical configs quickly within 10ms", () => {
    const snapshot = makeSnapshot(200);

    const start = performance.now();
    const result = diffConfigs(snapshot, snapshot);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
    expect(result.isIdentical).toBe(true);
  });

  it("diffs configs with column, style, and metadata changes within 50ms", () => {
    const before = makeSnapshot(50);
    const after: ConfigSnapshot = {
      ...before,
      format: "csv",
      style: { ...testStyle, headerBg: "#000000", fontSize: "12" },
      metadata: { ...testMetadata, name: "Modified Report", version: "2.0.0" },
    };

    const start = performance.now();
    const result = diffConfigs(before, after);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
    expect(result.changes.length).toBeGreaterThan(0);
  });
});
