/**
 * XSD element parser.
 *
 * Walks XSD element declarations, resolving types, refs, attributes,
 * and composition types. Each responsibility is separated into focused
 * functions per the Refactor Gate requirement (no function > 50 lines).
 */

import type { CompositionType } from "@/types";
import type { ParseWarning } from "@/types";
import type { MutableSchemaNode, TypeLookup, ParserOptions } from "./types";
import { xsdChildren, localPart, isBuiltinType } from "./namespace";
import { extractDocumentation } from "./documentation";
import { extractEnumerations, extractFacets } from "./type-lookup";

/** Parsing context passed through recursive calls */
interface ParseContext {
  readonly typeLookup: TypeLookup;
  readonly options: ParserOptions;
  readonly warnings: ParseWarning[];
  readonly visitedTypes: Set<string>;
  readonly startTime: number;
  nodeCount: number;
  idCounter: number;
}

/**
 * Creates a fresh parsing context.
 */
export function createContext(
  typeLookup: TypeLookup,
  options: ParserOptions,
): ParseContext {
  return {
    typeLookup,
    options,
    warnings: [],
    visitedTypes: new Set(),
    startTime: Date.now(),
    nodeCount: 0,
    idCounter: 0,
  };
}

/**
 * Generates a unique node ID.
 */
function nextId(ctx: ParseContext): string {
  return `n${ctx.idCounter++}`;
}

/**
 * Checks parser safety limits.
 * @throws Error if any limit is exceeded.
 */
function checkLimits(ctx: ParseContext, depth: number): void {
  if (depth > ctx.options.maxDepth) {
    throw new Error(`Maximum depth of ${ctx.options.maxDepth} exceeded`);
  }
  if (ctx.nodeCount >= ctx.options.maxNodes) {
    throw new Error(`Maximum node count of ${ctx.options.maxNodes} exceeded`);
  }
  if (Date.now() - ctx.startTime > ctx.options.timeoutMs) {
    throw new Error(`Parse timeout of ${ctx.options.timeoutMs}ms exceeded`);
  }
}

/**
 * Parses a single xs:element declaration into a MutableSchemaNode.
 *
 * Handles:
 * - Inline complex types (xs:complexType as child)
 * - Named type references (type= attribute)
 * - Element references (ref= attribute)
 * - Simple built-in types
 */
export function parseElement(
  el: Element,
  ctx: ParseContext,
  depth: number,
): MutableSchemaNode | null {
  checkLimits(ctx, depth);

  // Handle ref= elements
  const refAttr = el.getAttribute("ref");
  if (refAttr) {
    return resolveElementRef(refAttr, el, ctx, depth);
  }

  const name = el.getAttribute("name");
  if (!name) return null;

  ctx.nodeCount++;
  const minOccurs = el.getAttribute("minOccurs") ?? "1";
  const maxOccurs = el.getAttribute("maxOccurs") ?? "1";

  const node: MutableSchemaNode = {
    id: nextId(ctx),
    name,
    documentation: extractDocumentation(el),
    minOccurs,
    maxOccurs,
    type: "complex",
    typeName: "",
    children: [],
    isRequired: minOccurs !== "0",
  };

  // Check for inline complex type
  const inlineCT = xsdChildren(el, "complexType");
  if (inlineCT.length > 0 && inlineCT[0]) {
    node.children = parseComplexTypeContent(inlineCT[0], ctx, depth);
    node.compositionType = detectCompositionType(inlineCT[0]);
    parseAttributes(inlineCT[0], node, ctx);
    return node;
  }

  // Check for inline simple type (with enumerations and facets)
  const inlineST = xsdChildren(el, "simpleType");
  if (inlineST.length > 0 && inlineST[0]) {
    node.type = "simple";
    node.enumerations = extractEnumerations(inlineST[0]);
    node.facets = extractFacets(inlineST[0]);
    return node;
  }

  // Check type= attribute
  const typeAttr = el.getAttribute("type");
  if (typeAttr) {
    return resolveTypeAttribute(typeAttr, node, ctx, depth);
  }

  return node;
}

/**
 * Resolves an element ref= attribute to the referenced element.
 */
function resolveElementRef(
  refAttr: string,
  sourceEl: Element,
  ctx: ParseContext,
  depth: number,
): MutableSchemaNode | null {
  const refName = localPart(refAttr);
  const targetEl = ctx.typeLookup.elements.get(refName);

  if (!targetEl) {
    ctx.warnings.push({
      message: `Unresolved element ref="${refAttr}"`,
      location: sourceEl.tagName,
      severity: "warning",
    });
    return null;
  }

  // Parse the referenced element with the source's occurrence constraints
  const node = parseElement(targetEl, ctx, depth);
  if (node) {
    node.minOccurs = sourceEl.getAttribute("minOccurs") ?? node.minOccurs;
    node.maxOccurs = sourceEl.getAttribute("maxOccurs") ?? node.maxOccurs;
    node.isRequired = node.minOccurs !== "0";
  }
  return node;
}

/**
 * Resolves a type= attribute against the type lookup table.
 */
function resolveTypeAttribute(
  typeAttr: string,
  node: MutableSchemaNode,
  ctx: ParseContext,
  depth: number,
): MutableSchemaNode {
  const typeName = localPart(typeAttr);

  // Built-in XSD type
  if (isBuiltinType(typeName)) {
    node.type = "simple";
    node.typeName = typeName;
    return node;
  }

  // Check for circular reference
  if (ctx.visitedTypes.has(typeName)) {
    ctx.warnings.push({
      message: `Circular type reference detected: "${typeName}"`,
      location: node.name,
      severity: "error",
    });
    node.type = "complex";
    node.typeName = typeName;
    return node;
  }

  // Named complex type
  const ctDef = ctx.typeLookup.complexTypes.get(typeName);
  if (ctDef) {
    ctx.visitedTypes.add(typeName);
    node.children = parseComplexTypeContent(ctDef, ctx, depth);
    node.compositionType = detectCompositionType(ctDef);
    parseAttributes(ctDef, node, ctx);
    ctx.visitedTypes.delete(typeName);
    return node;
  }

  // Named simple type (may have enumerations and facets)
  const stDef = ctx.typeLookup.simpleTypes.get(typeName);
  if (stDef) {
    node.type = "simple";
    node.typeName = typeName;
    node.enumerations = extractEnumerations(stDef);
    node.facets = extractFacets(stDef);
    return node;
  }

  // Unknown type — treat as simple and warn
  ctx.warnings.push({
    message: `Unknown type "${typeAttr}" — treating as simple type`,
    location: node.name,
    severity: "warning",
  });
  node.type = "simple";
  node.typeName = typeName;
  return node;
}

/**
 * Parses the content of a complex type definition.
 * Handles xs:sequence, xs:all, xs:choice, and xs:complexContent.
 */
function parseComplexTypeContent(
  ctElement: Element,
  ctx: ParseContext,
  depth: number,
): MutableSchemaNode[] {
  const children: MutableSchemaNode[] = [];

  // Handle xs:complexContent/xs:extension
  for (const cc of xsdChildren(ctElement, "complexContent")) {
    for (const ext of xsdChildren(cc, "extension")) {
      // Resolve base type
      const baseType = ext.getAttribute("base");
      if (baseType) {
        const baseName = localPart(baseType);
        const baseDef = ctx.typeLookup.complexTypes.get(baseName);
        if (baseDef && !ctx.visitedTypes.has(baseName)) {
          ctx.visitedTypes.add(baseName);
          children.push(...parseComplexTypeContent(baseDef, ctx, depth));
          ctx.visitedTypes.delete(baseName);
        }
      }
      // Parse extension's own content
      children.push(...parseCompositors(ext, ctx, depth));
    }
  }

  // Handle xs:simpleContent (no child elements, just attributes)
  // Attributes are handled separately in parseAttributes

  // Parse direct compositor children
  children.push(...parseCompositors(ctElement, ctx, depth));

  return children;
}

/**
 * Parses compositor elements (sequence, all, choice) and their child elements.
 */
function parseCompositors(
  parent: Element,
  ctx: ParseContext,
  depth: number,
): MutableSchemaNode[] {
  const children: MutableSchemaNode[] = [];

  const compositorTags = ["sequence", "all", "choice"] as const;
  for (const tag of compositorTags) {
    for (const compositor of xsdChildren(parent, tag)) {
      for (const childEl of xsdChildren(compositor, "element")) {
        const parsed = parseElement(childEl, ctx, depth + 1);
        if (parsed) {
          children.push(parsed);
        }
      }

      // Handle nested compositors (e.g. choice inside sequence)
      children.push(...parseCompositors(compositor, ctx, depth + 1));
    }
  }

  return children;
}

/**
 * Detects the composition type of a complex type element.
 */
function detectCompositionType(ctElement: Element): CompositionType | undefined {
  if (xsdChildren(ctElement, "choice").length > 0) return "choice";
  if (xsdChildren(ctElement, "all").length > 0) return "all";
  if (xsdChildren(ctElement, "sequence").length > 0) return "sequence";
  return undefined;
}

/**
 * Parses xs:attribute declarations within a complex type
 * and adds them as child nodes with @ prefix.
 */
function parseAttributes(
  ctElement: Element,
  parentNode: MutableSchemaNode,
  ctx: ParseContext,
): void {
  for (const attrEl of xsdChildren(ctElement, "attribute")) {
    const name = attrEl.getAttribute("name");
    if (!name) continue;

    ctx.nodeCount++;
    const use = attrEl.getAttribute("use") ?? "optional";
    const typeAttr = attrEl.getAttribute("type");
    const typeName = typeAttr ? localPart(typeAttr) : "string";

    const attrNode: MutableSchemaNode = {
      id: nextId(ctx),
      name: `@${name}`,
      documentation: extractDocumentation(attrEl),
      minOccurs: use === "required" ? "1" : "0",
      maxOccurs: "1",
      type: "simple",
      typeName,
      children: [],
      isAttribute: true,
      isRequired: use === "required",
    };

    // Check for inline simple type with enumerations and facets
    const inlineST = xsdChildren(attrEl, "simpleType");
    if (inlineST.length > 0 && inlineST[0]) {
      attrNode.enumerations = extractEnumerations(inlineST[0]);
      attrNode.facets = extractFacets(inlineST[0]);
    }

    parentNode.children.push(attrNode);
  }
}

/**
 * Returns the accumulated warnings from parsing.
 */
export function getWarnings(ctx: ParseContext): ParseWarning[] {
  return [...ctx.warnings];
}

/**
 * Returns the total node count from parsing.
 */
export function getNodeCount(ctx: ParseContext): number {
  return ctx.nodeCount;
}
