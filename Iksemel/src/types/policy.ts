/**
 * Policy type definitions.
 *
 * Admins configure policy rules to enforce limits on exports
 * (e.g. max date range, required channel filter). Rules are
 * sent by WHATS'ON via postMessage and evaluated purely in the
 * browser — no server round-trips needed.
 */

/**
 * Types of policy rules that can be enforced.
 */
export type PolicyRuleType =
  | "SINGLE_SELECT"
  | "MAX_DATE_RANGE_DAYS"
  | "MAX_ESTIMATED_ROWS"
  | "REQUIRED_FILTER"
  | "MAX_SELECTED_VALUES";

/**
 * A single policy rule definition.
 */
export interface PolicyRule {
  /** Unique identifier for this rule */
  readonly id: string;
  /** The type of validation to perform */
  readonly type: PolicyRuleType;
  /** XPath of the field this rule applies to (if field-specific) */
  readonly xpath?: string;
  /** Rule-specific parameters (e.g. { maxDays: 365 }) */
  readonly params: Readonly<Record<string, unknown>>;
  /** Human-readable message shown when the rule is violated */
  readonly message: string;
}

/**
 * A detected policy violation.
 */
export interface PolicyViolation {
  /** ID of the rule that was violated */
  readonly ruleId: string;
  /** Human-readable violation message */
  readonly message: string;
  /** Severity level — errors block packaging, warnings are advisory */
  readonly severity: "error" | "warning";
}
