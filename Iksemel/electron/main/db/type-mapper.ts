import type { DbEngine } from "../../preload/api";

/**
 * Maps a raw DB column type string to an XSD type.
 * Returns null for types that should be excluded from the schema tree
 * (BLOB, CLOB, BYTEA, etc.).
 *
 * The input dbType may include length/precision: "VARCHAR2(100)", "NUMBER(10,2)".
 * Comparison is case-insensitive and ignores the parenthesised suffix.
 */
export function mapDbTypeToXsdType(dbType: string, engine: DbEngine): string | null {
  // Normalise: uppercase, strip parenthesised precision/length suffix
  const base = dbType.toUpperCase().replace(/\s*\(.*\)/, "").trim();

  // ── Excluded types (return null) ───────────────────────────────────────
  const excluded = new Set([
    "CLOB", "NCLOB", "BLOB", "BFILE",
    "BYTEA", "OID",
    "RAW", "LONG RAW", "LONG",
  ]);
  if (excluded.has(base)) return null;

  // ── String types ────────────────────────────────────────────────────────
  const stringTypes = new Set([
    "VARCHAR", "VARCHAR2", "NVARCHAR", "NVARCHAR2",
    "CHAR", "NCHAR",
    "TEXT", "TINYTEXT", "MEDIUMTEXT", "LONGTEXT",
    "CHARACTER VARYING", "CHARACTER",
    "XMLTYPE",
  ]);
  if (stringTypes.has(base)) return "xs:string";

  // ── Integer types ───────────────────────────────────────────────────────
  const integerTypes = new Set([
    "INTEGER", "INT", "INT2", "INT4", "INT8",
    "SMALLINT", "BIGINT", "TINYINT", "MEDIUMINT",
    "SMALLSERIAL", "SERIAL", "BIGSERIAL",
  ]);
  if (integerTypes.has(base)) return "xs:integer";

  // ── Decimal/float types ─────────────────────────────────────────────────
  const decimalTypes = new Set([
    "NUMERIC", "DECIMAL", "NUMBER",
    "FLOAT", "FLOAT4", "FLOAT8",
    "DOUBLE PRECISION", "DOUBLE",
    "REAL",
    "BINARY_FLOAT", "BINARY_DOUBLE",
    "MONEY",
  ]);
  if (decimalTypes.has(base)) return "xs:decimal";

  // ── Boolean ──────────────────────────────────────────────────────────────
  if (base === "BOOLEAN" || base === "BOOL") return "xs:boolean";

  // ── Date / time ─────────────────────────────────────────────────────────
  if (base === "DATE") {
    // Oracle DATE stores date + time; PG DATE is date-only
    return engine === "oracle" ? "xs:dateTime" : "xs:date";
  }

  const dateTimeTypes = new Set([
    "TIMESTAMP", "TIMESTAMPTZ",
    "TIMESTAMP WITH TIME ZONE",
    "TIMESTAMP WITH LOCAL TIME ZONE",
    "DATETIME",
    "INTERVAL",
    "TIME", "TIMETZ",
  ]);
  if (dateTimeTypes.has(base)) return "xs:dateTime";

  // ── UUID ──────────────────────────────────────────────────────────────────
  if (base === "UUID") return "xs:string";

  // ── JSON ──────────────────────────────────────────────────────────────────
  if (base === "JSON" || base === "JSONB") return "xs:string";

  // ── Fallback ──────────────────────────────────────────────────────────────
  return "xs:string";
}
