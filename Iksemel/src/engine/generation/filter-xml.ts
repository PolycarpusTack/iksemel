/**
 * XML Filter generator.
 *
 * Generates a well-formed XML filter document from a schema tree and selection state.
 * The filter document contains only the selected nodes, preserving the schema hierarchy.
 * All string values are escaped via escXml to prevent XML injection.
 */

import type { SchemaNode, SelectionState, FilterValuesState } from "@/types";
import { escXml } from "@/utils/xml";

/**
 * Configuration for filter XML generation.
 */
export interface FilterXmlOptions {
  /** Number of spaces per indentation level (default: 2) */
  readonly indent?: number;
  /** Whether to include the XML declaration (default: true) */
  readonly xmlDeclaration?: boolean;
  /** XML namespace URI for the filter document (default: none) */
  readonly namespace?: string;
  /** Active filter values to append as a <Filters> section */
  readonly filterValues?: FilterValuesState;
}

/** Default indentation: 2 spaces */
const DEFAULT_INDENT = 2;

/**
 * Generates well-formed XML filter content from schema nodes and selection state.
 *
 * Selected container nodes are emitted with their selected children nested inside.
 * Selected leaf nodes are emitted as self-closing elements.
 * The structure mirrors the original schema hierarchy but includes only selected nodes.
 *
 * @param roots - Root-level schema nodes
 * @param sel - Current selection state
 * @param options - Generation options
 * @returns Well-formed XML string
 *
 * @example
 * ```ts
 * const xml = generateFilterXml(schemaRoots, selection);
 * // <?xml version="1.0" encoding="UTF-8"?>
 * // <BroadcastExport>
 * //   <Channels>
 * //     <Channel>
 * //       <Schedule>
 * //         <Slot>
 * //           <SlotDate />
 * //           <Programme>
 * //             <Title />
 * //           </Programme>
 * //         </Slot>
 * //       </Schedule>
 * //     </Channel>
 * //   </Channels>
 * // </BroadcastExport>
 * ```
 */
export function generateFilterXml(
  roots: readonly SchemaNode[],
  sel: SelectionState,
  options: FilterXmlOptions = {},
): string {
  const indentSize = options.indent ?? DEFAULT_INDENT;
  const includeDeclaration = options.xmlDeclaration ?? true;

  const parts: string[] = [];

  if (includeDeclaration) {
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  }

  const body = buildFilterNodes(roots, sel, 0, indentSize, options.namespace);
  if (body) {
    parts.push(body);
  }

  // Append <Filters> section if filter values are provided
  if (options.filterValues && Object.keys(options.filterValues).length > 0) {
    parts.push(buildFiltersSection(options.filterValues, indentSize));
  }

  return parts.join("\n") + "\n";
}

/**
 * Recursively builds the filter XML for a set of nodes.
 */
function buildFilterNodes(
  nodes: readonly SchemaNode[],
  sel: SelectionState,
  depth: number,
  indentSize: number,
  namespace: string | undefined,
): string {
  const pad = " ".repeat(depth * indentSize);
  const lines: string[] = [];

  for (const node of nodes) {
    if (!sel[node.id]) continue;

    const escapedName = escXml(node.name);
    const nsAttr =
      depth === 0 && namespace !== undefined
        ? ` xmlns="${escXml(namespace)}"`
        : "";

    const hasSelectedChildren =
      node.children.length > 0 &&
      node.children.some((child) => sel[child.id]);

    if (hasSelectedChildren) {
      const childContent = buildFilterNodes(
        node.children,
        sel,
        depth + 1,
        indentSize,
        undefined, // namespace only on root
      );
      lines.push(`${pad}<${escapedName}${nsAttr}>`);
      lines.push(childContent);
      lines.push(`${pad}</${escapedName}>`);
    } else {
      lines.push(`${pad}<${escapedName}${nsAttr} />`);
    }
  }

  return lines.join("\n");
}

/**
 * Builds the <Filters> XML section from active filter values.
 */
function buildFiltersSection(
  filterValues: FilterValuesState,
  indentSize: number,
): string {
  const pad1 = " ".repeat(indentSize);
  const pad2 = " ".repeat(indentSize * 2);
  const lines: string[] = [];

  lines.push(`<Filters xmlns="urn:mediagenix:whatson:filter:v1">`);

  for (const filter of Object.values(filterValues)) {
    const xpathAttr = escXml(filter.xpath);
    const operatorAttr = escXml(filter.operator);

    if (filter.operator === "BETWEEN") {
      lines.push(`${pad1}<Filter xpath="${xpathAttr}" operator="${operatorAttr}">`);
      if (filter.rangeStart !== undefined) {
        lines.push(`${pad2}<RangeStart>${escXml(filter.rangeStart)}</RangeStart>`);
      }
      if (filter.rangeEnd !== undefined) {
        lines.push(`${pad2}<RangeEnd>${escXml(filter.rangeEnd)}</RangeEnd>`);
      }
      lines.push(`${pad1}</Filter>`);
    } else if (filter.operator === "IS_TRUE" || filter.operator === "IS_FALSE") {
      lines.push(`${pad1}<Filter xpath="${xpathAttr}" operator="${operatorAttr}" />`);
    } else if (filter.values.length > 0) {
      lines.push(`${pad1}<Filter xpath="${xpathAttr}" operator="${operatorAttr}">`);
      for (const value of filter.values) {
        lines.push(`${pad2}<Value>${escXml(value)}</Value>`);
      }
      lines.push(`${pad1}</Filter>`);
    } else {
      lines.push(`${pad1}<Filter xpath="${xpathAttr}" operator="${operatorAttr}" />`);
    }
  }

  lines.push(`</Filters>`);
  return lines.join("\n");
}
