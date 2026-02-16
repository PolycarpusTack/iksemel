/**
 * Filter value type definitions.
 *
 * Defines the operators and value structures used for type-aware
 * field filtering in the XFEB filter system.
 */

/**
 * Available filter operators.
 * The appropriate operators for a field depend on its XSD type.
 */
export type FilterOperator =
  | "IN"
  | "NOT_IN"
  | "BETWEEN"
  | "EQUALS"
  | "NOT_EQUALS"
  | "CONTAINS"
  | "STARTS_WITH"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "IS_TRUE"
  | "IS_FALSE";

/**
 * A single filter value applied to a schema field.
 */
export interface FilterValue {
  /** XPath expression identifying the filtered field */
  readonly xpath: string;
  /** Node ID of the filtered field in the schema tree */
  readonly nodeId: string;
  /** The comparison operator */
  readonly operator: FilterOperator;
  /** Discrete values for IN/NOT_IN/EQUALS/CONTAINS/STARTS_WITH operators */
  readonly values: readonly string[];
  /** Start of range for BETWEEN operator */
  readonly rangeStart?: string;
  /** End of range for BETWEEN operator */
  readonly rangeEnd?: string;
  /** XSD type name of the field (e.g. "date", "integer", "string") */
  readonly typeName: string;
}

/**
 * Maps node IDs to their active filter values.
 */
export type FilterValuesState = Readonly<Record<string, FilterValue>>;
