/**
 * Filter value helpers.
 *
 * Factory and validation utilities for creating and checking
 * filter values.
 */

import type {
  FilterValue,
  FilterOperator,
  SchemaNode,
  ReferenceData,
  RestrictionFacets,
} from "@/types";
import { getOperatorsForType } from "./operators";

/**
 * Builds the XPath for a schema node by walking up the tree.
 * Since nodes don't store their parent, we accept a path array.
 */
function buildXPath(path: readonly string[]): string {
  return path.join("/");
}

/**
 * Creates a default filter value for a schema node.
 *
 * Selects the first valid operator for the node's type and
 * initialises with empty values.
 *
 * @param node - The schema node to create a filter for
 * @param referenceData - Optional reference data from WHATS'ON
 * @param path - Path segments for XPath construction
 * @returns A new FilterValue with sensible defaults
 */
export function createDefaultFilter(
  node: SchemaNode,
  referenceData: ReferenceData | null,
  path: readonly string[] = [],
): FilterValue {
  const xpath = buildXPath([...path, node.name]);
  const hasEnums = (node.enumerations?.length ?? 0) > 0;
  const hasRefData = referenceData !== null && xpath in referenceData;
  const operators = getOperatorsForType(node.typeName, hasEnums, hasRefData);
  const defaultOp: FilterOperator = operators[0] ?? "EQUALS";

  return {
    xpath,
    nodeId: node.id,
    operator: defaultOp,
    values: [],
    typeName: node.typeName,
  };
}

/**
 * Validates a filter value against its field's restriction facets.
 *
 * @param filter - The filter value to validate
 * @param facets - Optional restriction facets from the XSD
 * @returns Array of validation error messages (empty if valid)
 */
export function validateFilterValue(
  filter: FilterValue,
  facets?: RestrictionFacets,
): string[] {
  const errors: string[] = [];

  if (!facets) return errors;

  // Validate range bounds against facets
  if (filter.rangeStart && facets.minInclusive) {
    if (filter.rangeStart < facets.minInclusive) {
      errors.push(`Start value must be at least ${facets.minInclusive}`);
    }
  }

  if (filter.rangeEnd && facets.maxInclusive) {
    if (filter.rangeEnd > facets.maxInclusive) {
      errors.push(`End value must be at most ${facets.maxInclusive}`);
    }
  }

  // Validate string length
  if (facets.maxLength !== undefined) {
    for (const value of filter.values) {
      if (value.length > facets.maxLength) {
        errors.push(`Value "${value}" exceeds maximum length of ${facets.maxLength}`);
      }
    }
  }

  if (facets.minLength !== undefined) {
    for (const value of filter.values) {
      if (value.length < facets.minLength) {
        errors.push(`Value "${value}" is shorter than minimum length of ${facets.minLength}`);
      }
    }
  }

  // Validate pattern
  if (facets.pattern) {
    try {
      const regex = new RegExp(`^${facets.pattern}$`);
      for (const value of filter.values) {
        if (!regex.test(value)) {
          errors.push(`Value "${value}" does not match required pattern`);
        }
      }
    } catch {
      // Invalid regex in XSD — skip validation
    }
  }

  return errors;
}
