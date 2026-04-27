import { Pool } from "pg";
import type { PoolConfig } from "pg";
import type {
  ConnectionProfileInput,
  TableInfo,
  ColumnInfo,
  ForeignKeyRelation,
  FieldSampleData,
  CardinalityStats,
} from "../../preload/api";

export class PgDriver {
  readonly engine = "postgres" as const;
  private pool: Pool | null = null;
  private schemas: string[] = ["public"];

  async connect(profile: ConnectionProfileInput): Promise<void> {
    const sslConfig = this.buildSslConfig(profile);

    const config: PoolConfig = {
      host: profile.host,
      port: profile.port,
      database: profile.database,
      user: profile.username,
      password: profile.password,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: sslConfig as PoolConfig["ssl"],
    };

    this.pool = new Pool(config);
    this.schemas = profile.schemas.length > 0 ? profile.schemas : ["public"];

    // Ping to validate credentials/connectivity
    await this.pool.query("SELECT NOW()");
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async getTables(): Promise<TableInfo[]> {
    const pool = this.requirePool();
    const schemaList = this.schemas.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `SELECT
         t.table_schema,
         t.table_name,
         t.table_type,
         s.n_live_tup::text AS row_count
       FROM information_schema.tables t
       LEFT JOIN pg_stat_user_tables s
         ON s.schemaname = t.table_schema AND s.relname = t.table_name
       WHERE t.table_schema IN (${schemaList})
         AND t.table_type IN ('BASE TABLE', 'VIEW')
       ORDER BY t.table_schema, t.table_name`,
      this.schemas,
    );

    return result.rows.map((row) => ({
      tableId: `${row.table_schema}.${row.table_name}`,
      schema: row.table_schema as string,
      name: row.table_name as string,
      type: row.table_type === "VIEW" ? "VIEW" : "TABLE",
      rowCount: row.row_count != null ? parseInt(row.row_count, 10) : undefined,
    }));
  }

  async getColumns(tableId: string): Promise<ColumnInfo[]> {
    const pool = this.requirePool();
    const parts = tableId.split(".");
    if (parts.length < 2 || !parts[0] || !parts[1]) throw new Error(`Invalid tableId: ${tableId}`);
    const [schema, tableName] = parts as [string, string];
    const result = await pool.query(
      `SELECT
         c.column_name,
         c.data_type,
         c.is_nullable,
         CASE WHEN kcu.column_name IS NOT NULL THEN true ELSE false END AS is_pk
       FROM information_schema.columns c
       LEFT JOIN information_schema.key_column_usage kcu
         ON kcu.table_schema = c.table_schema
        AND kcu.table_name = c.table_name
        AND kcu.column_name = c.column_name
        AND kcu.constraint_name IN (
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE constraint_type = 'PRIMARY KEY'
            AND table_schema = $1 AND table_name = $2
        )
       WHERE c.table_schema = $1 AND c.table_name = $2
       ORDER BY c.ordinal_position`,
      [schema, tableName],
    );

    return result.rows.map((row) => ({
      columnId: `${tableId}.${row.column_name}`,
      tableId,
      name: row.column_name as string,
      dbType: row.data_type as string,
      nullable: row.is_nullable === "YES",
      isPrimaryKey: row.is_pk === true,
    }));
  }

  async getForeignKeys(): Promise<ForeignKeyRelation[]> {
    const pool = this.requirePool();
    const schemaList = this.schemas.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `SELECT
         tc.constraint_name,
         kcu.table_schema AS from_schema,
         kcu.table_name  AS from_table,
         kcu.column_name AS from_column,
         ccu.table_schema AS to_schema,
         ccu.table_name   AS to_table,
         ccu.column_name  AS to_column,
         (SELECT COUNT(*) FROM information_schema.key_column_usage kcu2
          WHERE kcu2.constraint_name = tc.constraint_name
            AND kcu2.table_schema = kcu.table_schema) > 1 AS is_composite
       FROM information_schema.table_constraints AS tc
       JOIN information_schema.key_column_usage AS kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage AS ccu
         ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND kcu.table_schema IN (${schemaList})
       ORDER BY tc.constraint_name`,
      this.schemas,
    );

    return result.rows.map((row) => {
      const fromTableId = `${row.from_schema}.${row.from_table}`;
      const toTableId = `${row.to_schema}.${row.to_table}`;
      return {
        fkId: row.constraint_name as string,
        fromTableId,
        fromColumn: row.from_column as string,
        toTableId,
        toColumn: row.to_column as string,
        isComposite: row.is_composite === true,
        isSelfRef: fromTableId === toTableId,
        isCircular: false, // set later by cycle-detector
      };
    });
  }

  async fetchSampleStats(columns: string[]): Promise<FieldSampleData[]> {
    const pool = this.requirePool();
    const results: FieldSampleData[] = [];

    for (const colPath of columns) {
      // colPath format: "schema.table.column"
      const parts = colPath.split(".");
      if (parts.length < 3) continue;
      const schema = parts[0];
      const table = parts[1];
      const column = parts.slice(2).join(".");

      try {
        const result = await pool.query(
          `SELECT
             $3::text AS col_path,
             COUNT(*) AS total_count,
             COUNT(DISTINCT ${this.quoteIdent(column)}) AS distinct_count,
             COUNT(*) - COUNT(${this.quoteIdent(column)}) AS null_count,
             json_agg(json_build_object('value', ${this.quoteIdent(column)}::text, 'count', cnt) ORDER BY cnt DESC)
               FILTER (WHERE rn <= 20) AS top_values
           FROM (
             SELECT ${this.quoteIdent(column)}, COUNT(*) AS cnt,
                    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rn
             FROM ${this.quoteIdent(schema)}.${this.quoteIdent(table)} TABLESAMPLE SYSTEM(10)
             GROUP BY ${this.quoteIdent(column)}
           ) sub`,
          [schema, table, colPath],
        );

        const row = result.rows[0];
        results.push({
          fieldId: colPath,
          fieldPath: colPath,
          values: (row.top_values ?? []).map((v: { value: string; count: number }) => ({
            value: String(v.value),
            count: Number(v.count),
          })),
          totalCount: parseInt(row.total_count, 10),
          distinctCount: parseInt(row.distinct_count, 10),
          nullCount: parseInt(row.null_count, 10),
        });
      } catch {
        // Permission denied or other error — skip column silently
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
    const pool = this.requirePool();
    const parts = tableId.split(".");
    if (parts.length < 2 || !parts[0] || !parts[1]) throw new Error(`Invalid tableId: ${tableId}`);
    const [schema, table] = parts as [string, string];
    const result = await pool.query(
      `SELECT COUNT(*)::text AS count FROM ${this.quoteIdent(schema)}.${this.quoteIdent(table)}`,
    );
    return parseInt(result.rows[0].count, 10);
  }

  private quoteIdent(name: string): string {
    return '"' + name.replace(/"/g, '""') + '"';
  }

  private requirePool(): Pool {
    if (!this.pool) throw new Error("PgDriver: not connected");
    return this.pool;
  }

  private buildSslConfig(profile: ConnectionProfileInput): boolean | { rejectUnauthorized: boolean } {
    switch (profile.sslMode) {
      case "disable":
        return false;
      case "require":
        return { rejectUnauthorized: false };
      case "verify-full":
        return { rejectUnauthorized: true };
      default:
        return false;
    }
  }
}
