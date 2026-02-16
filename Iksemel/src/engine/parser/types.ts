import type { SchemaNode, CompositionType, RestrictionFacets } from "@/types";

/**
 * Internal mutable representation of a schema node during parsing.
 * Converted to readonly SchemaNode after parsing is complete.
 */
export interface MutableSchemaNode {
  id: string;
  name: string;
  documentation: string;
  minOccurs: string;
  maxOccurs: string;
  type: "simple" | "complex";
  typeName: string;
  children: MutableSchemaNode[];
  compositionType?: CompositionType;
  enumerations?: string[];
  isAttribute?: boolean;
  isRequired: boolean;
  facets?: RestrictionFacets;
}

/**
 * Lookup table for named types defined at the schema top level.
 * Maps qualified type names to their parsed definitions.
 */
export interface TypeLookup {
  /** Named complex types (xs:complexType[@name]) */
  readonly complexTypes: ReadonlyMap<string, Element>;
  /** Named simple types (xs:simpleType[@name]) */
  readonly simpleTypes: ReadonlyMap<string, Element>;
  /** Named elements (for ref= resolution) */
  readonly elements: ReadonlyMap<string, Element>;
}

/**
 * Configuration options for the XSD parser.
 */
export interface ParserOptions {
  /** Maximum recursion depth (default: 20) */
  readonly maxDepth: number;
  /** Maximum number of nodes to parse (default: 5000) */
  readonly maxNodes: number;
  /** Parse timeout in milliseconds (default: 5000) */
  readonly timeoutMs: number;
}

/**
 * Default parser configuration.
 */
export const DEFAULT_PARSER_OPTIONS: ParserOptions = {
  maxDepth: 20,
  maxNodes: 5000,
  timeoutMs: 5000,
};

/**
 * Freezes a mutable node tree into an immutable SchemaNode tree.
 */
export function freezeNode(node: MutableSchemaNode): SchemaNode {
  return {
    ...node,
    children: node.children.map(freezeNode),
    enumerations: node.enumerations ? [...node.enumerations] : undefined,
    facets: node.facets,
  };
}
