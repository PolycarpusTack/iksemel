/**
 * Documentation extraction from XSD annotation elements.
 */

/**
 * Extracts documentation text from xs:annotation/xs:documentation
 * children of an XSD element.
 *
 * @param element - The XSD element to extract documentation from
 * @returns The documentation text, or empty string if none found
 */
export function extractDocumentation(element: Element): string {
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i];
    if (!child) continue;
    if (child.localName === "annotation") {
      for (let j = 0; j < child.children.length; j++) {
        const doc = child.children[j];
        if (!doc) continue;
        if (doc.localName === "documentation") {
          return doc.textContent?.trim() ?? "";
        }
      }
    }
  }
  return "";
}
