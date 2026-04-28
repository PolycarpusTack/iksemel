import type { SchemaNode, ParseResult, ParseWarning } from "@/types";

let nodeCounter = 0;

function nextId(): string {
  return `n${nodeCounter++}`;
}

function buildNode(element: Element): SchemaNode {
  const children: SchemaNode[] = [];

  // Attributes become child nodes with @ prefix
  for (const attr of Array.from(element.attributes)) {
    children.push({
      id: nextId(),
      name: `@${attr.name}`,
      documentation: "",
      minOccurs: "0",
      maxOccurs: "1",
      type: "simple",
      typeName: "string",
      children: [],
      isRequired: false,
      isAttribute: true,
    });
  }

  // Deduplicate child element names — only one representative per name
  const seen = new Set<string>();
  for (const child of Array.from(element.children)) {
    if (!seen.has(child.localName)) {
      seen.add(child.localName);
      children.push(buildNode(child));
    }
  }

  const hasElementChildren = element.children.length > 0;

  return {
    id: nextId(),
    name: element.localName,
    documentation: "",
    minOccurs: "0",
    maxOccurs: "unbounded",
    type: hasElementChildren ? "complex" : "simple",
    typeName: hasElementChildren ? "" : "string",
    children,
    isRequired: false,
  };
}

function countAllNodes(nodes: readonly SchemaNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1 + countAllNodes(node.children);
  }
  return count;
}

export function parseXmlSample(xmlText: string): ParseResult {
  nodeCounter = 0;
  const warnings: ParseWarning[] = [];

  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    warnings.push({
      message: parseError.textContent ?? "XML parse error",
      location: "",
      severity: "error",
    });
    return { roots: [], warnings, nodeCount: 0 };
  }

  const root = doc.documentElement;
  if (!root) {
    warnings.push({ message: "No root element found", location: "", severity: "error" });
    return { roots: [], warnings, nodeCount: 0 };
  }

  const roots = [buildNode(root)];
  return { roots, warnings, nodeCount: countAllNodes(roots) };
}
