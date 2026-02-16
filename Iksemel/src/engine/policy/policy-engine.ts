/**
 * Policy validation engine.
 *
 * Evaluates policy rules against the current filter values, schema,
 * and selection state. Returns an array of violations. All logic is
 * pure — no side effects, no DOM access.
 */

import type {
  PolicyRule,
  PolicyViolation,
  FilterValuesState,
  SelectionState,
  SchemaNode,
} from "@/types";

/**
 * Evaluates all policy rules and returns any violations.
 *
 * @param rules - Policy rules to evaluate
 * @param filterValues - Current filter values
 * @param schema - Parsed schema roots
 * @param selection - Current selection state
 * @returns Array of policy violations (empty if all rules pass)
 */
export function evaluatePolicy(
  rules: readonly PolicyRule[],
  filterValues: FilterValuesState,
  schema: readonly SchemaNode[] | null,
  selection: SelectionState,
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const rule of rules) {
    const violation = evaluateRule(rule, filterValues, schema, selection);
    if (violation) {
      violations.push(violation);
    }
  }

  return violations;
}

function evaluateRule(
  rule: PolicyRule,
  filterValues: FilterValuesState,
  _schema: readonly SchemaNode[] | null,
  _selection: SelectionState,
): PolicyViolation | null {
  switch (rule.type) {
    case "REQUIRED_FILTER":
      return evaluateRequiredFilter(rule, filterValues);
    case "SINGLE_SELECT":
      return evaluateSingleSelect(rule, filterValues);
    case "MAX_DATE_RANGE_DAYS":
      return evaluateMaxDateRange(rule, filterValues);
    case "MAX_ESTIMATED_ROWS":
      return evaluateMaxEstimatedRows(rule, filterValues);
    case "MAX_SELECTED_VALUES":
      return evaluateMaxSelectedValues(rule, filterValues);
    default:
      return null;
  }
}

function evaluateRequiredFilter(
  rule: PolicyRule,
  filterValues: FilterValuesState,
): PolicyViolation | null {
  if (!rule.xpath) return null;

  // Check if any filter exists for this xpath
  const hasFilter = Object.values(filterValues).some(
    (f) => f.xpath === rule.xpath && (f.values.length > 0 || f.rangeStart || f.rangeEnd),
  );

  if (!hasFilter) {
    return {
      ruleId: rule.id,
      message: rule.message,
      severity: "error",
    };
  }

  return null;
}

function evaluateSingleSelect(
  rule: PolicyRule,
  filterValues: FilterValuesState,
): PolicyViolation | null {
  if (!rule.xpath) return null;

  const filter = Object.values(filterValues).find((f) => f.xpath === rule.xpath);
  if (!filter) return null;

  if (filter.values.length > 1) {
    return {
      ruleId: rule.id,
      message: rule.message,
      severity: "error",
    };
  }

  return null;
}

function evaluateMaxDateRange(
  rule: PolicyRule,
  filterValues: FilterValuesState,
): PolicyViolation | null {
  if (!rule.xpath) return null;

  const maxDays = typeof rule.params["maxDays"] === "number" ? rule.params["maxDays"] : 365;
  const filter = Object.values(filterValues).find((f) => f.xpath === rule.xpath);
  if (!filter || !filter.rangeStart || !filter.rangeEnd) return null;

  const start = new Date(filter.rangeStart);
  const end = new Date(filter.rangeEnd);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > maxDays) {
    return {
      ruleId: rule.id,
      message: rule.message,
      severity: "error",
    };
  }

  return null;
}

function evaluateMaxEstimatedRows(
  rule: PolicyRule,
  filterValues: FilterValuesState,
): PolicyViolation | null {
  const maxRows = typeof rule.params["maxRows"] === "number" ? rule.params["maxRows"] : 100000;

  // Simple heuristic: if no filters are set, estimate is high
  const filterCount = Object.keys(filterValues).length;
  if (filterCount === 0) {
    return {
      ruleId: rule.id,
      message: rule.message,
      severity: "warning",
    };
  }

  // If an estimated row count is provided in params, use it
  const estimatedRows = typeof rule.params["currentEstimate"] === "number"
    ? rule.params["currentEstimate"]
    : null;

  if (estimatedRows !== null && estimatedRows > maxRows) {
    return {
      ruleId: rule.id,
      message: rule.message,
      severity: "error",
    };
  }

  return null;
}

function evaluateMaxSelectedValues(
  rule: PolicyRule,
  filterValues: FilterValuesState,
): PolicyViolation | null {
  if (!rule.xpath) return null;

  const maxValues = typeof rule.params["maxValues"] === "number" ? rule.params["maxValues"] : 10;
  const filter = Object.values(filterValues).find((f) => f.xpath === rule.xpath);
  if (!filter) return null;

  if (filter.values.length > maxValues) {
    return {
      ruleId: rule.id,
      message: rule.message,
      severity: "error",
    };
  }

  return null;
}
