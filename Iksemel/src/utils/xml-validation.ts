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

export function validateXmlDocument(
  xml: string,
  mimeType: XmlMimeType = "application/xml",
): XmlValidationResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, mimeType);
  const error = extractParseError(doc);
  return {
    valid: error === null,
    error,
    doc,
  };
}
