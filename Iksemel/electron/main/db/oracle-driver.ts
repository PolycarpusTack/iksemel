import oracledb from "oracledb";
import type { Connection } from "oracledb";
import type {
  ConnectionProfileInput,
  TableInfo,
  ColumnInfo,
  ForeignKeyRelation,
  FieldSampleData,
  CardinalityStats,
} from "../../preload/api";
import { mapDbTypeToXsdType } from "./type-mapper";

export class OracleClientMissingError extends Error {
  constructor(cause: string) {
    super(
      `Oracle Instant Client not found. Download from https://www.oracle.com/database/technologies/instant-client.html\n\nOriginal error: ${cause}`,
    );
    this.name = "OracleClientMissingError";
  }
}

export class OracleDriver {
  private connection: Connection | null = null;
  private schemas: string[] = [];

  async connect(profile: ConnectionProfileInput): Promise<void> {
    try {
      oracledb.initOracleClient();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("DPI-1047") || msg.includes("Cannot locate")) {
        throw new OracleClientMissingError(msg);
      }
      throw err;
    }

    const connectString = profile.tnsAlias
      ? profile.tnsAlias
      : `${profile.host}:${profile.port}/${profile.database}`;

    this.connection = await oracledb.getConnection({
      user: profile.username,
      password: profile.password,
      connectString,
      walletLocation: profile.walletDir,
    });

    this.schemas =
      profile.schemas.length > 0
        ? profile.schemas.map((s) => s.toUpperCase())
        : [profile.username.toUpperCase()];

    // Ping
    await this.connection.execute("SELECT 1 FROM DUAL");
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  async getTables(): Promise<TableInfo[]> {
    const conn = this.requireConnection();
    const schemaBinds = this.schemas.map((_, i) => `:s${i}`).join(", ");
    const binds = Object.fromEntries(this.schemas.map((s, i) => [`s${i}`, s]));

    const result = await conn.execute<{
      OWNER: string;
      TABLE_NAME: string;
      OBJECT_TYPE: string;
      NUM_ROWS: number | null;
    }>(
      `SELECT owner, object_name AS table_name, object_type,
              (SELECT num_rows FROM all_tables t WHERE t.owner = o.owner AND t.table_name = o.object_name) AS num_rows
       FROM all_objects o
       WHERE owner IN (${schemaBinds})
         AND object_type IN ('TABLE', 'VIEW')
       ORDER BY owner, object_name`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return (result.rows ?? []).map((row) => ({
      tableId: `${row.OWNER.toLowerCase()}.${row.TABLE_NAME.toLowerCase()}`,
      schema: row.OWNER.toLowerCase(),
      name: row.TABLE_NAME.toLowerCase(),
      type: row.OBJECT_TYPE === "VIEW" ? ("VIEW" as const) : ("TABLE" as const),
      rowCount: row.NUM_ROWS ?? undefined,
    }));
  }

  async getColumns(tableId: string): Promise<ColumnInfo[]> {
    const conn = this.requireConnection();
    const [schema, tableName] = tableId.split(".");
    const result = await conn.execute<{
      COLUMN_NAME: string;
      DATA_TYPE: string;
      NULLABLE: string;
      IS_PK: number;
    }>(
      `SELECT c.column_name, c.data_type, c.nullable,
              CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END AS is_pk
       FROM all_tab_columns c
       LEFT JOIN (
         SELECT cc.column_name
         FROM all_cons_columns cc
         JOIN all_constraints con
           ON con.constraint_name = cc.constraint_name
          AND con.owner = cc.owner
         WHERE con.constraint_type = 'P'
           AND con.owner = :owner
           AND con.table_name = :tname
       ) pk ON pk.column_name = c.column_name
       WHERE c.owner = :owner AND c.table_name = :tname
       ORDER BY c.column_id`,
      {
        owner: schema.toUpperCase(),
        tname: tableName.toUpperCase(),
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return (result.rows ?? [])
      .filter((row) => {
        // Exclude CLOB/BLOB/RAW types
        const xsdType = mapDbTypeToXsdType(row.DATA_TYPE, "oracle");
        return xsdType !== null;
      })
      .map((row) => ({
        columnId: `${tableId}.${row.COLUMN_NAME.toLowerCase()}`,
        tableId,
        name: row.COLUMN_NAME.toLowerCase(),
        dbType: row.DATA_TYPE,
        nullable: row.NULLABLE === "Y",
        isPrimaryKey: row.IS_PK === 1,
      }));
  }

  async getForeignKeys(): Promise<ForeignKeyRelation[]> {
    const conn = this.requireConnection();
    const schemaBinds = this.schemas.map((_, i) => `:s${i}`).join(", ");
    const binds = Object.fromEntries(this.schemas.map((s, i) => [`s${i}`, s]));

    const result = await conn.execute<{
      CONSTRAINT_NAME: string;
      FROM_OWNER: string;
      FROM_TABLE: string;
      FROM_COLUMN: string;
      TO_OWNER: string;
      TO_TABLE: string;
      TO_COLUMN: string;
    }>(
      `SELECT a.constraint_name, a.owner AS from_owner, a.table_name AS from_table,
              ac.column_name AS from_column,
              b.owner AS to_owner, b.table_name AS to_table,
              bc.column_name AS to_column
       FROM all_constraints a
       JOIN all_constraints b ON a.r_constraint_name = b.constraint_name AND a.r_owner = b.owner
       JOIN all_cons_columns ac ON ac.constraint_name = a.constraint_name AND ac.owner = a.owner
       JOIN all_cons_columns bc ON bc.constraint_name = b.constraint_name AND bc.owner = b.owner
                                AND bc.position = ac.position
       WHERE a.constraint_type = 'R'
         AND a.owner IN (${schemaBinds})
       ORDER BY a.constraint_name`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    // Group by constraint_name to detect composites
    const grouped = new Map<
      string,
      Array<{
        CONSTRAINT_NAME: string;
        FROM_OWNER: string;
        FROM_TABLE: string;
        FROM_COLUMN: string;
        TO_OWNER: string;
        TO_TABLE: string;
        TO_COLUMN: string;
      }>
    >();
    for (const row of result.rows ?? []) {
      if (!grouped.has(row.CONSTRAINT_NAME)) grouped.set(row.CONSTRAINT_NAME, []);
      grouped.get(row.CONSTRAINT_NAME)!.push(row);
    }

    const fks: ForeignKeyRelation[] = [];
    for (const [constraintName, rows] of grouped) {
      const first = rows[0];
      const fromTableId = `${first.FROM_OWNER.toLowerCase()}.${first.FROM_TABLE.toLowerCase()}`;
      const toTableId = `${first.TO_OWNER.toLowerCase()}.${first.TO_TABLE.toLowerCase()}`;
      fks.push({
        fkId: constraintName,
        fromTableId,
        fromColumn: first.FROM_COLUMN.toLowerCase(),
        toTableId,
        toColumn: first.TO_COLUMN.toLowerCase(),
        isComposite: rows.length > 1,
        isSelfRef: fromTableId === toTableId,
        isCircular: false,
      });
    }

    return fks;
  }

  async fetchSampleStats(columns: string[]): Promise<FieldSampleData[]> {
    const conn = this.requireConnection();
    const results: FieldSampleData[] = [];

    for (const colPath of columns) {
      const parts = colPath.split(".");
      if (parts.length < 3) continue;
      const schema = parts[0].toUpperCase();
      const table = parts[1].toUpperCase();
      const column = parts.slice(2).join(".").toUpperCase();

      try {
        const result = await conn.execute<{
          TOTAL_COUNT: number;
          DISTINCT_COUNT: number;
          NULL_COUNT: number;
        }>(
          `SELECT COUNT(*) AS total_count,
                  COUNT(DISTINCT ${this.quoteIdent(column)}) AS distinct_count,
                  SUM(CASE WHEN ${this.quoteIdent(column)} IS NULL THEN 1 ELSE 0 END) AS null_count
           FROM ${this.quoteIdent(schema)}.${this.quoteIdent(table)} SAMPLE(10)`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
        );
        const row = result.rows?.[0];
        results.push({
          fieldId: colPath,
          fieldPath: colPath,
          values: [],
          totalCount: row?.TOTAL_COUNT ?? 0,
          distinctCount: row?.DISTINCT_COUNT ?? 0,
          nullCount: row?.NULL_COUNT ?? 0,
        });
      } catch {
        results.push({
          fieldId: colPath,
          fieldPath: colPath,
          values: [],
          totalCount: 0,
          distinctCount: 0,
          nullCount: 0,
        });
      }
    }

    return results;
  }

  async fetchCardinality(tableId: string): Promise<CardinalityStats> {
    const count = await this.getRowCount(tableId);
    return {
      elementPath: tableId,
      avgCount: count,
      minCount: 0,
      maxCount: count,
      sampleSize: count,
    };
  }

  async getRowCount(tableId: string): Promise<number> {
    const conn = this.requireConnection();
    const [schema, table] = tableId.split(".");
    const result = await conn.execute<{ CNT: number }>(
      `SELECT COUNT(*) AS cnt FROM ${this.quoteIdent(schema.toUpperCase())}.${this.quoteIdent(table.toUpperCase())}`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows?.[0]?.CNT ?? 0;
  }

  private quoteIdent(name: string): string {
    return '"' + name.replace(/"/g, '""') + '"';
  }

  private requireConnection(): Connection {
    if (!this.connection) throw new Error("OracleDriver: not connected");
    return this.connection;
  }
}
