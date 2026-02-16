import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "./policy-engine";
import type { PolicyRule, FilterValuesState } from "@/types";

describe("Policy Engine", () => {
  // ── REQUIRED_FILTER ──────────────────────────────────────────────

  describe("REQUIRED_FILTER", () => {
    const rule: PolicyRule = {
      id: "req-channel",
      type: "REQUIRED_FILTER",
      xpath: "Channel/ChannelName",
      params: {},
      message: "A channel filter is required.",
    };

    it("returns violation when no filter exists for the required xpath", () => {
      const violations = evaluatePolicy([rule], {}, null, {});
      expect(violations).toHaveLength(1);
      expect(violations[0]!.ruleId).toBe("req-channel");
      expect(violations[0]!.severity).toBe("error");
    });

    it("passes when filter exists with values", () => {
      const filterValues: FilterValuesState = {
        n1: {
          xpath: "Channel/ChannelName",
          nodeId: "n1",
          operator: "IN",
          values: ["BBC One"],
          typeName: "string",
        },
      };
      const violations = evaluatePolicy([rule], filterValues, null, {});
      expect(violations).toHaveLength(0);
    });

    it("returns violation when filter exists but has no values", () => {
      const filterValues: FilterValuesState = {
        n1: {
          xpath: "Channel/ChannelName",
          nodeId: "n1",
          operator: "IN",
          values: [],
          typeName: "string",
        },
      };
      const violations = evaluatePolicy([rule], filterValues, null, {});
      expect(violations).toHaveLength(1);
    });
  });

  // ── SINGLE_SELECT ────────────────────────────────────────────────

  describe("SINGLE_SELECT", () => {
    const rule: PolicyRule = {
      id: "single-channel",
      type: "SINGLE_SELECT",
      xpath: "Channel/ChannelName",
      params: {},
      message: "Only one channel may be selected.",
    };

    it("passes when one value is selected", () => {
      const filterValues: FilterValuesState = {
        n1: {
          xpath: "Channel/ChannelName",
          nodeId: "n1",
          operator: "IN",
          values: ["BBC One"],
          typeName: "string",
        },
      };
      const violations = evaluatePolicy([rule], filterValues, null, {});
      expect(violations).toHaveLength(0);
    });

    it("returns violation when multiple values are selected", () => {
      const filterValues: FilterValuesState = {
        n1: {
          xpath: "Channel/ChannelName",
          nodeId: "n1",
          operator: "IN",
          values: ["BBC One", "ITV"],
          typeName: "string",
        },
      };
      const violations = evaluatePolicy([rule], filterValues, null, {});
      expect(violations).toHaveLength(1);
      expect(violations[0]!.ruleId).toBe("single-channel");
    });

    it("passes when no filter exists for the xpath", () => {
      const violations = evaluatePolicy([rule], {}, null, {});
      expect(violations).toHaveLength(0);
    });
  });

  // ── MAX_DATE_RANGE_DAYS ──────────────────────────────────────────

  describe("MAX_DATE_RANGE_DAYS", () => {
    const rule: PolicyRule = {
      id: "max-date",
      type: "MAX_DATE_RANGE_DAYS",
      xpath: "Slot/SlotDate",
      params: { maxDays: 365 },
      message: "Date range must not exceed 365 days.",
    };

    it("passes when date range is within limit", () => {
      const filterValues: FilterValuesState = {
        n1: {
          xpath: "Slot/SlotDate",
          nodeId: "n1",
          operator: "BETWEEN",
          values: [],
          rangeStart: "2025-01-01",
          rangeEnd: "2025-06-30",
          typeName: "date",
        },
      };
      const violations = evaluatePolicy([rule], filterValues, null, {});
      expect(violations).toHaveLength(0);
    });

    it("returns violation when date range exceeds limit", () => {
      const filterValues: FilterValuesState = {
        n1: {
          xpath: "Slot/SlotDate",
          nodeId: "n1",
          operator: "BETWEEN",
          values: [],
          rangeStart: "2025-01-01",
          rangeEnd: "2026-06-30",
          typeName: "date",
        },
      };
      const violations = evaluatePolicy([rule], filterValues, null, {});
      expect(violations).toHaveLength(1);
      expect(violations[0]!.ruleId).toBe("max-date");
    });

    it("passes when no filter exists for the xpath", () => {
      const violations = evaluatePolicy([rule], {}, null, {});
      expect(violations).toHaveLength(0);
    });
  });

  // ── MAX_SELECTED_VALUES ──────────────────────────────────────────

  describe("MAX_SELECTED_VALUES", () => {
    const rule: PolicyRule = {
      id: "max-vals",
      type: "MAX_SELECTED_VALUES",
      xpath: "Genre/GenreName",
      params: { maxValues: 3 },
      message: "Select at most 3 genres.",
    };

    it("passes when values count is within limit", () => {
      const filterValues: FilterValuesState = {
        n1: {
          xpath: "Genre/GenreName",
          nodeId: "n1",
          operator: "IN",
          values: ["Drama", "Comedy"],
          typeName: "string",
        },
      };
      const violations = evaluatePolicy([rule], filterValues, null, {});
      expect(violations).toHaveLength(0);
    });

    it("returns violation when values count exceeds limit", () => {
      const filterValues: FilterValuesState = {
        n1: {
          xpath: "Genre/GenreName",
          nodeId: "n1",
          operator: "IN",
          values: ["Drama", "Comedy", "News", "Sport"],
          typeName: "string",
        },
      };
      const violations = evaluatePolicy([rule], filterValues, null, {});
      expect(violations).toHaveLength(1);
    });
  });

  // ── MAX_ESTIMATED_ROWS ───────────────────────────────────────────

  describe("MAX_ESTIMATED_ROWS", () => {
    const rule: PolicyRule = {
      id: "max-rows",
      type: "MAX_ESTIMATED_ROWS",
      xpath: undefined,
      params: { maxRows: 100000 },
      message: "Estimated rows exceed limit.",
    };

    it("returns warning when no filters are set", () => {
      const violations = evaluatePolicy([rule], {}, null, {});
      expect(violations).toHaveLength(1);
      expect(violations[0]!.severity).toBe("warning");
    });

    it("passes when some filters are set", () => {
      const filterValues: FilterValuesState = {
        n1: {
          xpath: "Channel/ChannelName",
          nodeId: "n1",
          operator: "IN",
          values: ["BBC One"],
          typeName: "string",
        },
      };
      const violations = evaluatePolicy([rule], filterValues, null, {});
      expect(violations).toHaveLength(0);
    });
  });

  // ── Multiple rules ───────────────────────────────────────────────

  describe("Multiple rules", () => {
    it("evaluates all rules and returns all violations", () => {
      const rules: PolicyRule[] = [
        {
          id: "req-channel",
          type: "REQUIRED_FILTER",
          xpath: "Channel/ChannelName",
          params: {},
          message: "Channel filter required.",
        },
        {
          id: "req-date",
          type: "REQUIRED_FILTER",
          xpath: "Slot/SlotDate",
          params: {},
          message: "Date filter required.",
        },
      ];

      const violations = evaluatePolicy(rules, {}, null, {});
      expect(violations).toHaveLength(2);
    });
  });
});
