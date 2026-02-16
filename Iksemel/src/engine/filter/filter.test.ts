import { describe, it, expect } from "vitest";
import { getOperatorsForType } from "./operators";
import { createDefaultFilter, validateFilterValue } from "./filter-helpers";
import { makeLeaf } from "@/test/fixtures";
import type { FilterValue, RestrictionFacets } from "@/types";

describe("getOperatorsForType", () => {
  it("returns IN/NOT_IN for fields with enumerations", () => {
    const ops = getOperatorsForType("string", true, false);
    expect(ops).toEqual(["IN", "NOT_IN"]);
  });

  it("returns IN/NOT_IN for fields with reference data", () => {
    const ops = getOperatorsForType("string", false, true);
    expect(ops).toEqual(["IN", "NOT_IN"]);
  });

  it("returns IS_TRUE/IS_FALSE for boolean", () => {
    const ops = getOperatorsForType("boolean", false, false);
    expect(ops).toEqual(["IS_TRUE", "IS_FALSE"]);
  });

  it("returns range operators for date types", () => {
    const ops = getOperatorsForType("date", false, false);
    expect(ops).toContain("BETWEEN");
    expect(ops).toContain("EQUALS");
    expect(ops).toContain("GREATER_THAN");
    expect(ops).toContain("LESS_THAN");
  });

  it("returns range operators for dateTime", () => {
    const ops = getOperatorsForType("dateTime", false, false);
    expect(ops).toContain("BETWEEN");
  });

  it("returns numeric operators for integer types", () => {
    const ops = getOperatorsForType("integer", false, false);
    expect(ops).toContain("BETWEEN");
    expect(ops).toContain("EQUALS");
    expect(ops).toContain("NOT_EQUALS");
    expect(ops).toContain("GREATER_THAN");
    expect(ops).toContain("LESS_THAN");
  });

  it("returns numeric operators for decimal", () => {
    const ops = getOperatorsForType("decimal", false, false);
    expect(ops).toContain("BETWEEN");
  });

  it("returns string operators for default string type", () => {
    const ops = getOperatorsForType("string", false, false);
    expect(ops).toContain("EQUALS");
    expect(ops).toContain("NOT_EQUALS");
    expect(ops).toContain("CONTAINS");
    expect(ops).toContain("STARTS_WITH");
  });

  it("returns duration operators", () => {
    const ops = getOperatorsForType("duration", false, false);
    expect(ops).toContain("BETWEEN");
    expect(ops).toContain("EQUALS");
  });
});

describe("createDefaultFilter", () => {
  it("creates a filter with default operator for string field", () => {
    const node = makeLeaf("n1", "Title", "string");
    const filter = createDefaultFilter(node, null, ["Programme"]);
    expect(filter.xpath).toBe("Programme/Title");
    expect(filter.nodeId).toBe("n1");
    expect(filter.operator).toBe("EQUALS");
    expect(filter.values).toEqual([]);
    expect(filter.typeName).toBe("string");
  });

  it("creates a filter with IN operator for enum field", () => {
    const node: ReturnType<typeof makeLeaf> = {
      ...makeLeaf("n2", "Channel", "string"),
      enumerations: ["BBC One", "ITV", "Channel 4"],
    };
    const filter = createDefaultFilter(node, null, []);
    expect(filter.operator).toBe("IN");
  });

  it("creates a filter with BETWEEN operator for date field", () => {
    const node = makeLeaf("n3", "SlotDate", "date");
    const filter = createDefaultFilter(node, null, ["Slot"]);
    expect(filter.operator).toBe("BETWEEN");
    expect(filter.xpath).toBe("Slot/SlotDate");
  });

  it("creates a filter with IN operator when reference data exists", () => {
    const node = makeLeaf("n4", "ChannelName", "string");
    const refData = {
      "Channel/ChannelName": {
        xpath: "Channel/ChannelName",
        values: ["BBC One", "ITV"],
      },
    };
    const filter = createDefaultFilter(node, refData, ["Channel"]);
    expect(filter.operator).toBe("IN");
  });
});

describe("validateFilterValue", () => {
  it("returns no errors when no facets are present", () => {
    const filter: FilterValue = {
      xpath: "Test",
      nodeId: "n1",
      operator: "EQUALS",
      values: ["hello"],
      typeName: "string",
    };
    expect(validateFilterValue(filter)).toEqual([]);
  });

  it("validates maxLength", () => {
    const filter: FilterValue = {
      xpath: "Test",
      nodeId: "n1",
      operator: "EQUALS",
      values: ["toolongvalue"],
      typeName: "string",
    };
    const facets: RestrictionFacets = { maxLength: 5 };
    const errors = validateFilterValue(filter, facets);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("exceeds maximum length");
  });

  it("validates minLength", () => {
    const filter: FilterValue = {
      xpath: "Test",
      nodeId: "n1",
      operator: "EQUALS",
      values: ["ab"],
      typeName: "string",
    };
    const facets: RestrictionFacets = { minLength: 5 };
    const errors = validateFilterValue(filter, facets);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("shorter than minimum length");
  });

  it("validates pattern", () => {
    const filter: FilterValue = {
      xpath: "Test",
      nodeId: "n1",
      operator: "EQUALS",
      values: ["abc123"],
      typeName: "string",
    };
    const facets: RestrictionFacets = { pattern: "[A-Z]+" };
    const errors = validateFilterValue(filter, facets);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("does not match required pattern");
  });

  it("validates minInclusive for range start", () => {
    const filter: FilterValue = {
      xpath: "Test",
      nodeId: "n1",
      operator: "BETWEEN",
      values: [],
      rangeStart: "2020-01-01",
      rangeEnd: "2025-12-31",
      typeName: "date",
    };
    const facets: RestrictionFacets = { minInclusive: "2022-01-01" };
    const errors = validateFilterValue(filter, facets);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("at least");
  });

  it("passes when all facets are satisfied", () => {
    const filter: FilterValue = {
      xpath: "Test",
      nodeId: "n1",
      operator: "EQUALS",
      values: ["HELLO"],
      typeName: "string",
    };
    const facets: RestrictionFacets = { maxLength: 10, pattern: "[A-Z]+" };
    const errors = validateFilterValue(filter, facets);
    expect(errors).toEqual([]);
  });
});
