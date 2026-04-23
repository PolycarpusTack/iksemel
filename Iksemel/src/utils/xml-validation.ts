export interface XmlValidationResult {
  readonly valid: boolean;
  readonly error: string | null;
  readonly doc: Document;
}

type XmlMimeType = DOMParserSupportedType;

function extractParseError(doc: Document): string | null {
  const parserError = doc.querySelector("parsererror")
    ?? doc.getElementsByTagName("parsererror")[0]
    ?? null;

  if (!parserError) {
    return null;
  }

  const raw = parserError.textContent?.trim() ?? "Unknown XML parse error";
  return raw.slice(0, 240);
}

function containsDoctype(xml: string): boolean {
  return /<!DOCTYPE\s/i.test(xml);
}

export function validateXmlDocument(
  xml: string,
  mimeType: XmlMimeType = "application/xml",
): XmlValidationResult {
  if (containsDoctype(xml)) {
    const emptyDoc = new DOMParser().parseFromString("<empty/>", "application/xml");
    return {
      valid: false,
      error: "DOCTYPE declarations are not allowed",
      doc: emptyDoc,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, mimeType);
  const error = extractParseError(doc);
  return {
    valid: error === null,
    error,
    doc,
  };
}
