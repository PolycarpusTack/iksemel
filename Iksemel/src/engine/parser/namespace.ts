/**
 * XML Schema namespace utilities.
 *
 * Handles namespace-aware element lookups in XSD documents,
 * supporting both prefixed (xs:element) and default namespace usage.
 */

/** W3C XML Schema namespace URI */
export const XSD_NAMESPACE = "http://www.w3.org/2001/XMLSchema";

/**
 * Gets direct children of a parent element matching a given local name
 * within the XML Schema namespace.
 *
 * @param parent - The parent DOM element
 * @param localName - The local name to match (e.g. "element", "complexType")
 * @returns Array of matching child elements
 */
export function xsdChildren(parent: Element, localName: string): Element[] {
  const result: Element[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (!child) continue;
    if (
      child.localName === localName &&
      (child.namespaceURI === XSD_NAMESPACE || !child.namespaceURI)
    ) {
      result.push(child);
    }
  }
  return result;
}

/**
 * Extracts the local part of a potentially namespace-prefixed name.
 *
 * @param qualifiedName - A name like "tns:ChannelType" or "xs:string"
 * @returns The local part, e.g. "ChannelType" or "string"
 *
 * @example
 * ```ts
 * localPart("tns:ChannelType")  // "ChannelType"
 * localPart("string")            // "string"
 * ```
 */
export function localPart(qualifiedName: string): string {
  const colonIndex = qualifiedName.indexOf(":");
  return colonIndex >= 0 ? qualifiedName.substring(colonIndex + 1) : qualifiedName;
}

/**
 * Checks whether a type name refers to a built-in XSD type.
 *
 * @param typeName - The local type name (without namespace prefix)
 * @returns true if this is a built-in XSD simple type
 */
export function isBuiltinType(typeName: string): boolean {
  return BUILTIN_TYPES.has(typeName);
}

/** Set of built-in XSD type local names */
const BUILTIN_TYPES: ReadonlySet<string> = new Set([
  "string",
  "boolean",
  "decimal",
  "float",
  "double",
  "duration",
  "dateTime",
  "time",
  "date",
  "gYearMonth",
  "gYear",
  "gMonthDay",
  "gDay",
  "gMonth",
  "hexBinary",
  "base64Binary",
  "anyURI",
  "QName",
  "NOTATION",
  "normalizedString",
  "token",
  "language",
  "NMTOKEN",
  "NMTOKENS",
  "Name",
  "NCName",
  "ID",
  "IDREF",
  "IDREFS",
  "ENTITY",
  "ENTITIES",
  "integer",
  "nonPositiveInteger",
  "negativeInteger",
  "long",
  "int",
  "short",
  "byte",
  "nonNegativeInteger",
  "unsignedLong",
  "unsignedInt",
  "unsignedShort",
  "unsignedByte",
  "positiveInteger",
]);
