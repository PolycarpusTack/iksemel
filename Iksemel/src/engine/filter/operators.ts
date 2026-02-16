/**
 * Filter operator resolution.
 *
 * Determines which filter operators are valid for a given XSD type,
 * taking into account whether the field has enumeration values or
 * reference data.
 */

import type { FilterOperator } from "@/types";

/** Date/time type names */
const DATE_TYPES = new Set(["date", "dateTime", "time", "gYear", "gYearMonth", "gMonthDay"]);

/** Numeric type names */
const NUMERIC_TYPES = new Set([
  "integer", "int", "long", "short", "byte", "decimal", "float", "double",
  "nonPositiveInteger", "negativeInteger", "nonNegativeInteger",
  "unsignedLong", "unsignedInt", "unsignedShort", "unsignedByte",
  "positiveInteger",
]);

/**
 * Returns the valid filter operators for a given field type.
 *
 * @param typeName - The XSD type name (e.g. "string", "date", "integer")
 * @param hasEnumerations - Whether the field has xs:enumeration values
 * @param hasReferenceData - Whether WHATS'ON sent reference data for this field
 * @returns Array of valid filter operators
 */
export function getOperatorsForType(
  typeName: string,
  hasEnumerations: boolean,
  hasReferenceData: boolean,
): FilterOperator[] {
  // Enum or reference data fields → multiselect
  if (hasEnumerations || hasReferenceData) {
    return ["IN", "NOT_IN"];
  }

  // Boolean → toggle
  if (typeName === "boolean") {
    return ["IS_TRUE", "IS_FALSE"];
  }

  // Duration → range
  if (typeName === "duration") {
    return ["BETWEEN", "EQUALS", "GREATER_THAN", "LESS_THAN"];
  }

  // Date/time → range
  if (DATE_TYPES.has(typeName)) {
    return ["BETWEEN", "EQUALS", "GREATER_THAN", "LESS_THAN"];
  }

  // Numeric → range + comparisons
  if (NUMERIC_TYPES.has(typeName)) {
    return ["BETWEEN", "EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN"];
  }

  // String (default) → text search
  return ["EQUALS", "NOT_EQUALS", "CONTAINS", "STARTS_WITH"];
}
