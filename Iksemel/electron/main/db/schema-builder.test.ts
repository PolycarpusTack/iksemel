// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildSchemaTree } from "./schema-builder";
import type {
  TableInfo,
  ColumnInfo,
  ForeignKeyRelation,
  SchemaTreeOptions,
  SchemaNode,
} from "../../preload/api";

const defaultOptions: SchemaTreeOptions = {
  selectedTableIds: ["public.programme", "public.genre"],
  fkDecisions: {},
  includeViews: false,
  maxSelfRefDepth: 3,
};

const tables: TableInfo[] = [
  { tableId: "public.programme", schema: "public", name: "programme", type: "TABLE" },
  { tableId: "public.genre", schema: "public", name: "genre", type: "TABLE" },
];

const columnsMap = new Map<string, ColumnInfo[]>([
  [
    "public.programme",
    [
      { columnId: "c1", tableId: "public.programme", name: "id", dbType: "INTEGER", nullable: false, isPrimaryKey: true },
      { columnId: "c2", tableId: "public.programme", name: "title", dbType: "VARCHAR(200)", nullable: false, isPrimaryKey: false },
      { columnId: "c3", tableId: "public.programme", name: "genre_id", dbType: "INTEGER", nullable: true, isPrimaryKey: false },
    ],
  ],
  [
    "public.genre",
    [
      { columnId: "c4", tableId: "public.genre", name: "id", dbType: "INTEGER", nullable: false, isPrimaryKey: true },
      { columnId: "c5", tableId: "public.genre", name: "name", dbType: "VARCHAR(100)", nullable: false, isPrimaryKey: false },
    ],
  ],
]);

describe("buildSchemaTree", () => {
  it("returns one root SchemaNode per selected table", () => {
    const result = buildSchemaTree(tables, columnsMap, [], defaultOptions, "postgres");
    expect(result).toHaveLength(2);
    expect(result.map((n) => n.name)).toContain("programme");
    expect(result.map((n) => n.name)).toContain("genre");
  });

  it("root nodes are complex type with children matching columns", () => {
    const result = buildSchemaTree(tables, columnsMap, [], defaultOptions, "postgres");
    const prog = result.find((n) => n.name === "programme")!;
    expect(prog.type).toBe("complex");
    expect(prog.children).toHaveLength(3); // id, title, genre_id
  });

  it("nullable column → minOccurs 0; NOT NULL → minOccurs 1", () => {
    const result = buildSchemaTree(tables, columnsMap, [], defaultOptions, "postgres");
    const prog = result.find((n) => n.name === "programme")!;
    const title = prog.children.find((c) => c.name === "title")!;
    const genreId = prog.children.find((c) => c.name === "genre_id")!;
    expect(title.minOccurs).toBe("1");
    expect(genreId.minOccurs).toBe("0");
  });

  it("maps column dbType to correct XSD type", () => {
    const result = buildSchemaTree(tables, columnsMap, [], defaultOptions, "postgres");
    const prog = result.find((n) => n.name === "programme")!;
    const id = prog.children.find((c) => c.name === "id")!;
    expect(id.typeName).toBe("xs:integer");
    const title = prog.children.find((c) => c.name === "title")!;
    expect(title.typeName).toBe("xs:string");
  });

  it("excludes tables not in selectedTableIds", () => {
    const opts: SchemaTreeOptions = { ...defaultOptions, selectedTableIds: ["public.programme"] };
    const result = buildSchemaTree(tables, columnsMap, [], opts, "postgres");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("programme");
  });

  it("excludes VIEW tables when includeViews is false", () => {
    const tablesWithView: TableInfo[] = [
      ...tables,
      { tableId: "public.v_summary", schema: "public", name: "v_summary", type: "VIEW" },
    ];
    const opts: SchemaTreeOptions = {
      ...defaultOptions,
      selectedTableIds: ["public.programme", "public.genre", "public.v_summary"],
      includeViews: false,
    };
    const result = buildSchemaTree(tablesWithView, columnsMap, [], opts, "postgres");
    expect(result.map((n) => n.name)).not.toContain("v_summary");
  });

  it("includes VIEW tables when includeViews is true", () => {
    const viewCols = new Map(columnsMap);
    viewCols.set("public.v_summary", [
      { columnId: "cv1", tableId: "public.v_summary", name: "title", dbType: "TEXT", nullable: true, isPrimaryKey: false },
    ]);
    const tablesWithView: TableInfo[] = [
      ...tables,
      { tableId: "public.v_summary", schema: "public", name: "v_summary", type: "VIEW" },
    ];
    const opts: SchemaTreeOptions = {
      ...defaultOptions,
      selectedTableIds: ["public.programme", "public.genre", "public.v_summary"],
      includeViews: true,
    };
    const result = buildSchemaTree(tablesWithView, viewCols, [], opts, "postgres");
    expect(result.map((n) => n.name)).toContain("v_summary");
  });

  it("nests FK child columns under parent when decision is 'nest'", () => {
    const fks: ForeignKeyRelation[] = [
      {
        fkId: "fk1",
        fromTableId: "public.programme",
        fromColumn: "genre_id",
        toTableId: "public.genre",
        toColumn: "id",
        isComposite: false,
        isSelfRef: false,
        isCircular: false,
      },
    ];
    const opts: SchemaTreeOptions = {
      ...defaultOptions,
      fkDecisions: { fk1: "nest" },
    };
    const result = buildSchemaTree(tables, columnsMap, fks, opts, "postgres");
    const prog = result.find((n) => n.name === "programme")!;
    const genreChild = prog.children.find((c) => c.name === "genre");
    expect(genreChild).toBeDefined();
    expect(genreChild!.type).toBe("complex");
  });

  it("prefixes reserved XML name 'xml' with table name", () => {
    const colsWithReserved = new Map(columnsMap);
    colsWithReserved.set("public.programme", [
      { columnId: "cx", tableId: "public.programme", name: "xml", dbType: "TEXT", nullable: true, isPrimaryKey: false },
    ]);
    const result = buildSchemaTree(tables, colsWithReserved, [], defaultOptions, "postgres");
    const prog = result.find((n) => n.name === "programme")!;
    expect(prog.children[0].name).toBe("programme_xml");
  });

  it("forces circular FK to flat regardless of fkDecisions", () => {
    const fks: ForeignKeyRelation[] = [
      {
        fkId: "fk-circular",
        fromTableId: "public.programme",
        fromColumn: "genre_id",
        toTableId: "public.genre",
        toColumn: "id",
        isComposite: false,
        isSelfRef: false,
        isCircular: true, // cycle-detector marked this
      },
    ];
    const opts: SchemaTreeOptions = {
      ...defaultOptions,
      fkDecisions: { "fk-circular": "nest" }, // user tried to nest but it's circular
    };
    const result = buildSchemaTree(tables, columnsMap, fks, opts, "postgres");
    const prog = result.find((n) => n.name === "programme")!;
    // Should NOT have a nested genre child — forced flat
    const genreChild = prog.children.find((c) => c.name === "genre");
    expect(genreChild).toBeUndefined();
  });
});
