/**
 * Composition type for XSD container elements.
 * Determines how child elements relate to each other.
 */
export type CompositionType = "sequence" | "choice" | "all";

/**
 * Represents a single node in a parsed XSD schema tree.
 * Every element, attribute, and complex type maps to a SchemaNode.
 */
export interface SchemaNode {
  /** Unique identifier within the parsed tree */
  readonly id: string;
  /** Element or attribute name from the XSD */
  readonly name: string;
  /** Human-readable documentation from xs:annotation/xs:documentation */
  readonly documentation: string;
  /** Minimum occurrences (from minOccurs attribute, default "1") */
  readonly minOccurs: string;
  /** Maximum occurrences (from maxOccurs attribute, default "1"; "unbounded" for repeating) */
  readonly maxOccurs: string;
  /** Whether this is a simple or complex type */
  readonly type: "simple" | "complex";
  /** XSD type name for simple types (e.g. "string", "dateTime", "integer") */
  readonly typeName: string;
  /** Child nodes for complex types */
  readonly children: readonly SchemaNode[];
  /** How children are composed (sequence, choice, all) */
  readonly compositionType?: CompositionType;
  /** Enumeration values for restricted simple types */
  readonly enumerations?: readonly string[];
  /** Whether this node represents an attribute (prefixed with @) */
  readonly isAttribute?: boolean;
  /** Whether this is a required field (minOccurs > 0) */
  readonly isRequired: boolean;
  /** Restriction facets from xs:restriction (e.g. minInclusive, pattern) */
  readonly facets?: RestrictionFacets;
}

/**
 * XSD restriction facets extracted from xs:simpleType/xs:restriction.
 * All fields are optional — only present facets are populated.
 */
export interface RestrictionFacets {
  readonly minInclusive?: string;
  readonly maxInclusive?: string;
  readonly minExclusive?: string;
  readonly maxExclusive?: string;
  readonly pattern?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly totalDigits?: number;
  readonly fractionDigits?: number;
}

/**
 * Result of parsing an XSD document.
 * Contains the tree plus any warnings or errors from partial parsing.
 */
export interface ParseResult {
  /** Root-level schema nodes */
  readonly roots: readonly SchemaNode[];
  /** Warnings from non-fatal parse issues (e.g. unsupported constructs) */
  readonly warnings: readonly ParseWarning[];
  /** Total number of nodes parsed */
  readonly nodeCount: number;
}

/**
 * A warning generated during XSD parsing for unsupported or problematic constructs.
 */
export interface ParseWarning {
  /** Human-readable warning message */
  readonly message: string;
  /** XPath-like location in the XSD where the issue occurred */
  readonly location: string;
  /** Severity of the warning */
  readonly severity: "info" | "warning" | "error";
}
