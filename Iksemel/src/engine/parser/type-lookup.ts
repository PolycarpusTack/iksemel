/**
 * Type lookup table builder.
 *
 * Scans a parsed XSD document for named type definitions
 * (xs:complexType[@name], xs:simpleType[@name]) and top-level
 * element declarations (for ref= resolution). Returns an
 * independently testable lookup structure.
 */

import type { TypeLookup } from "./types";
import type { RestrictionFacets } from "@/types";
import { xsdChildren } from "./namespace";

/**
 * Builds a lookup table from a parsed XSD document's root element.
 *
 * Scans for:
 * - Top-level xs:complexType with @name attribute
 * - Top-level xs:simpleType with @name attribute
 * - Top-level xs:element with @name attribute (for ref= resolution)
 *
 * @param schemaElement - The root xs:schema element
 * @returns Lookup table mapping names to their DOM elements
 */
export function buildTypeLookup(schemaElement: Element): TypeLookup {
  const complexTypes = new Map<string, Element>();
  const simpleTypes = new Map<string, Element>();
  const elements = new Map<string, Element>();

  for (const ct of xsdChildren(schemaElement, "complexType")) {
    const name = ct.getAttribute("name");
    if (name) {
      complexTypes.set(name, ct);
    }
  }

  for (const st of xsdChildren(schemaElement, "simpleType")) {
    const name = st.getAttribute("name");
    if (name) {
      simpleTypes.set(name, st);
    }
  }

  for (const el of xsdChildren(schemaElement, "element")) {
    const name = el.getAttribute("name");
    if (name) {
      elements.set(name, el);
    }
  }

  return { complexTypes, simpleTypes, elements };
}

/**
 * Extracts enumeration values from a simple type definition.
 *
 * Looks for xs:restriction/xs:enumeration elements within the
 * simple type and collects their @value attributes.
 *
 * @param simpleTypeElement - The xs:simpleType element
 * @returns Array of enumeration values, or undefined if none found
 */
export function extractEnumerations(simpleTypeElement: Element): string[] | undefined {
  const restrictions = xsdChildren(simpleTypeElement, "restriction");
  if (restrictions.length === 0) return undefined;

  const enums: string[] = [];
  for (const restriction of restrictions) {
    for (const enumEl of xsdChildren(restriction, "enumeration")) {
      const value = enumEl.getAttribute("value");
      if (value !== null) {
        enums.push(value);
      }
    }
  }

  return enums.length > 0 ? enums : undefined;
}

/**
 * Extracts restriction facets from a simple type definition.
 *
 * Reads xs:restriction children (minInclusive, maxInclusive, pattern,
 * minLength, maxLength, etc.) and returns a RestrictionFacets object.
 *
 * @param simpleTypeElement - The xs:simpleType element
 * @returns RestrictionFacets object, or undefined if no facets found
 */
export function extractFacets(simpleTypeElement: Element): RestrictionFacets | undefined {
  const restrictions = xsdChildren(simpleTypeElement, "restriction");
  if (restrictions.length === 0) return undefined;

  const facets: Record<string, string | number | undefined> = {};
  let found = false;

  for (const restriction of restrictions) {
    for (const child of Array.from(restriction.children)) {
      const localName = child.localName;
      const value = child.getAttribute("value");
      if (value === null) continue;

      switch (localName) {
        case "minInclusive":
          facets["minInclusive"] = value;
          found = true;
          break;
        case "maxInclusive":
          facets["maxInclusive"] = value;
          found = true;
          break;
        case "minExclusive":
          facets["minExclusive"] = value;
          found = true;
          break;
        case "maxExclusive":
          facets["maxExclusive"] = value;
          found = true;
          break;
        case "pattern":
          facets["pattern"] = value;
          found = true;
          break;
        case "minLength": {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) { facets["minLength"] = parsed; found = true; }
          break;
        }
        case "maxLength": {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) { facets["maxLength"] = parsed; found = true; }
          break;
        }
        case "totalDigits": {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) { facets["totalDigits"] = parsed; found = true; }
          break;
        }
        case "fractionDigits": {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) { facets["fractionDigits"] = parsed; found = true; }
          break;
        }
      }
    }
  }

  return found ? (facets as unknown as RestrictionFacets) : undefined;
}
