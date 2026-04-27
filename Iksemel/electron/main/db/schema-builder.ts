import type {
  TableInfo,
  ColumnInfo,
  ForeignKeyRelation,
  SchemaTreeOptions,
  SchemaNode,
  DbEngine,
} from "../../preload/api";
import { mapDbTypeToXsdType } from "./type-mapper";
import { detectCycles } from "./cycle-detector";

// XML names that must be prefixed to avoid conflicts (namespace prefixes / XML spec reserved)
const RESERVED_XML_NAMES = new Set([
  "xml", "xsl", "xslt", "xmlns", "xlink",
]);

function sanitiseColumnName(colName: string, tableName: string): string {
  const lower = colName.toLowerCase();
  if (RESERVED_XML_NAMES.has(lower)) {
    return `${tableName}_${lower}`;
  }
  return lower;
}

function buildColumnNode(col: ColumnInfo, tableName: string, engine: DbEngine, nextId: () => string): SchemaNode | null {
  const xsdType = mapDbTypeToXsdType(col.dbType, engine);
  if (xsdType === null) return null; // excluded type (BLOB, CLOB, etc.)

  return {
    id: nextId(),
    name: sanitiseColumnName(col.name, tableName),
    documentation: "",
    minOccurs: col.nullable ? "0" : "1",
    maxOccurs: "1",
    type: "simple",
    typeName: xsdType,
    children: [],
    compositionType: undefined,
    isRequired: !col.nullable,
  };
}

function buildNestedTableNode(
  table: TableInfo,
  columns: Map<string, ColumnInfo[]>,
  engine: DbEngine,
  nextId: () => string,
): SchemaNode {
  const tableCols = columns.get(table.tableId) ?? [];
  const children: SchemaNode[] = [];
  for (const col of tableCols) {
    const node = buildColumnNode(col, table.name, engine, nextId);
    if (node) children.push(node);
  }
  return {
    id: nextId(),
    name: table.name.toLowerCase(),
    documentation: "",
    minOccurs: "0",
    maxOccurs: "unbounded",
    type: "complex",
    typeName: "",
    children,
    compositionType: "sequence",
    isRequired: false,
  };
}

export function buildSchemaTree(
  tables: TableInfo[],
  columns: Map<string, ColumnInfo[]>,
  fks: ForeignKeyRelation[],
  options: SchemaTreeOptions,
  engine: DbEngine,
): SchemaNode[] {
  let nodeCounter = 0;
  const nextId = (): string => `n${nodeCounter++}`;

  // options.maxSelfRefDepth is intentionally not implemented yet.
  // Self-referential FKs are always treated as circular and forced flat
  // by the cycle detector. Depth-limited nesting is a future enhancement.
  const selectedSet = new Set(options.selectedTableIds);

  // Run cycle detection on the provided FKs
  const fksWithCycles = detectCycles(fks);

  // Index tables by tableId
  const tableMap = new Map(tables.map((t) => [t.tableId, t]));

  // Determine which FK→table relationships to nest
  // isCircular or isComposite FKs are always forced flat
  const nestDecisions = new Map<string, string>(); // fkId → toTableId (only for "nest")
  for (const fk of fksWithCycles) {
    if (fk.isCircular || fk.isComposite) continue;
    if (!selectedSet.has(fk.fromTableId) || !selectedSet.has(fk.toTableId)) continue;
    const decision = options.fkDecisions[fk.fkId] ?? "flat";
    if (decision === "nest") {
      nestDecisions.set(fk.fkId, fk.toTableId);
    }
  }

  // Tables that are nested children should not appear as roots
  const nestedTableIds = new Set(nestDecisions.values());

  const roots: SchemaNode[] = [];

  for (const tableId of options.selectedTableIds) {
    const table = tableMap.get(tableId);
    if (!table) continue;
    if (!options.includeViews && table.type === "VIEW") continue;
    if (nestedTableIds.has(tableId)) continue; // rendered as child

    const tableCols = columns.get(tableId) ?? [];
    const children: SchemaNode[] = [];

    for (const col of tableCols) {
      // Check if this column is a FK that nests
      const nestingFk = fksWithCycles.find(
        (fk) => fk.fromTableId === tableId &&
          fk.fromColumn === col.name &&
          nestDecisions.has(fk.fkId),
      );
      if (nestingFk) {
        const childTableId = nestDecisions.get(nestingFk.fkId)!;
        const childTable = tableMap.get(childTableId);
        if (childTable) {
          children.push(buildNestedTableNode(childTable, columns, engine, nextId));
        }
      } else {
        const node = buildColumnNode(col, table.name, engine, nextId);
        if (node) children.push(node);
      }
    }

    roots.push({
      id: nextId(),
      name: table.name.toLowerCase(),
      documentation: "",
      minOccurs: "1",
      maxOccurs: "unbounded",
      type: "complex",
      typeName: "",
      children,
      compositionType: "sequence",
      isRequired: true,
    });
  }

  return roots;
}
