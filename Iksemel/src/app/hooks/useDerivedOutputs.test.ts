import { describe, expect, it } from "vitest";
import { INITIAL_STATE, type AppState } from "@/state";
import type { SchemaNode } from "@/types";
import { deriveOutputs } from "./useDerivedOutputs";

const schemaFixture: readonly SchemaNode[] = [
  {
    id: "slot",
    name: "Slot",
    documentation: "",
    minOccurs: "1",
    maxOccurs: "unbounded",
    type: "complex",
    typeName: "complexType",
    isRequired: true,
    children: [
      {
        id: "title",
        name: "Title",
        documentation: "",
        minOccurs: "0",
        maxOccurs: "1",
        type: "simple",
        typeName: "string",
        isRequired: false,
        children: [],
      },
    ],
  },
];

function createState(overrides: Partial<AppState>): AppState {
  return {
    ...INITIAL_STATE,
    ...overrides,
  };
}

describe("useDerivedOutputs", () => {
  it("returns safe defaults when schema is not loaded", () => {
    const result = deriveOutputs(createState({}));

    expect(result.totalCount).toBe(0);
    expect(result.selectedCount).toBe(0);
    expect(result.filterXml).toBe("");
    expect(result.reportXml).toBe("");
    expect(result.xsltOutput).toBe("");
    expect(result.slug).toBe("export");
  });

  it("derives metrics and output strings from loaded state", () => {
    const state = createState({
      schema: schemaFixture,
      selection: { slot: true, title: true },
      columns: [
        {
          id: "title",
          xpath: "Slot/Title",
          header: "Title",
          format: "text",
          align: "left",
          width: 120,
          fullPath: "Slot/Title",
        },
      ],
      rowSource: "//Slot",
      metadata: {
        ...INITIAL_STATE.metadata,
        name: "Daily Export",
      },
      filterValues: {
        title: {
          xpath: "Slot/Title",
          nodeId: "title",
          operator: "CONTAINS",
          values: ["News"],
          typeName: "string",
        },
      },
      searchQuery: "Title",
    });

    const result = deriveOutputs(state);

    expect(result.totalCount).toBe(2);
    expect(result.selectedCount).toBe(2);
    expect(result.reductionPct).toBeGreaterThanOrEqual(0);
    expect(result.searchMatchCount).toBe(1);
    expect(result.selectedLeaves).toHaveLength(1);
    expect(result.repeatingElements.length).toBeGreaterThan(0);
    expect(result.orphanedColumns).toHaveLength(0);
    expect(result.slug).toBe("daily-export");
    expect(result.filterXml).toContain("Slot/Title");
    expect(result.reportXml).toContain("Daily Export");
    expect(result.xsltOutput.length).toBeGreaterThan(0);
  });
});
