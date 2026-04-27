// Full type surface for window.electronAPI.
// Types are defined here (not imported from src/) because tsconfig.electron.json
// excludes the src/ directory.

// ── Shared domain types ────────────────────────────────────────────────────

export type DbEngine = "postgres" | "oracle";

export type SslMode = "disable" | "require" | "verify-full";

export interface ConnectionProfileInput {
  label: string;
  engine: DbEngine;
  host: string;
  port: number;
  database: string; // DB name (PG) or service name (Oracle)
  username: string;
  password: string;
  schemas: string[]; // schema/owner filter, e.g. ["public"] or ["HR"]
  sslMode?: SslMode; // PG only
  caCertPath?: string; // PG only — path to custom CA cert
  tnsAlias?: string; // Oracle only — TNS alias instead of host/port
  walletDir?: string; // Oracle only
  isFavourite?: boolean;
}

export interface ConnectionProfile extends Omit<ConnectionProfileInput, "password"> {
  id: string;
  createdAt: number;
  lastUsed?: number;
  schemaConfig?: SchemaConfig;
}

export interface SchemaConfig {
  selectedTableIds: string[];
  fkDecisions: Record<string, "nest" | "flat">;
  includeViews: boolean;
  maxSelfRefDepth: number;
}

export interface TestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
}

export interface ConnectionResult {
  connectionId: string;
  engine: DbEngine;
  profileId: string;
}

export interface TableInfo {
  tableId: string; // "schema.tableName"
  schema: string;
  name: string;
  type: "TABLE" | "VIEW";
  rowCount?: number;
}

export interface ColumnInfo {
  columnId: string; // "schema.table.column"
  tableId: string;
  name: string;
  dbType: string; // raw DB type string, e.g. "VARCHAR2", "NUMBER(10,2)"
  nullable: boolean;
  isPrimaryKey: boolean;
}

export interface ForeignKeyRelation {
  fkId: string;
  fromTableId: string;
  fromColumn: string;
  toTableId: string;
  toColumn: string;
  isComposite: boolean;
  isSelfRef: boolean;
  isCircular: boolean; // set by cycle detector
}

export interface SchemaTreeOptions {
  selectedTableIds: string[];
  fkDecisions: Record<string, "nest" | "flat">;
  includeViews: boolean;
  maxSelfRefDepth: number;
}

// Inline copy of SchemaNode from src/types/schema.ts
// Must stay in sync — both define the same shape.
export type CompositionType = "sequence" | "choice" | "all";

export interface SchemaNode {
  readonly id: string;
  readonly name: string;
  readonly documentation: string;
  readonly minOccurs: string;
  readonly maxOccurs: string;
  readonly type: "simple" | "complex";
  readonly typeName: string;
  readonly children: readonly SchemaNode[];
  readonly compositionType?: CompositionType;
  readonly enumerations?: readonly string[];
  readonly isAttribute?: boolean;
  readonly isRequired: boolean;
  readonly facets?: RestrictionFacets;
}

export interface RestrictionFacets {
  readonly minInclusive?: string;
  readonly maxInclusive?: string;
  readonly minExclusive?: string;
  readonly maxExclusive?: string;
  readonly pattern?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly totalDigits?: number;
  readonly fractionDigits?: number;
}

// Inline copies of DataProvider stats types from src/engine/data-provider/types.ts
export interface SampleValue {
  value: string;
  count: number;
}

export interface FieldSampleData {
  fieldId: string;
  fieldPath: string;
  values: SampleValue[];
  totalCount: number;
  distinctCount: number;
  nullCount: number;
}

export interface CardinalityStats {
  elementPath: string;
  avgCount: number;
  minCount: number;
  maxCount: number;
  sampleSize: number;
}

export interface PackageFiles {
  [filename: string]: string; // filename → file content
}

export interface SaveResult {
  savedPaths: string[];
  outputDir: string;
}

// ── ElectronAPI surface ────────────────────────────────────────────────────

export interface ElectronAPI {
  connections: {
    testConnection(profile: ConnectionProfileInput): Promise<TestResult>;
    connect(profileId: string): Promise<ConnectionResult>;
    disconnect(connectionId: string): Promise<void>;
    listProfiles(): Promise<ConnectionProfile[]>;
    saveProfile(profile: ConnectionProfileInput): Promise<ConnectionProfile>;
    deleteProfile(profileId: string): Promise<void>;
    setFavourite(profileId: string, favourite: boolean): Promise<void>;
  };
  schema: {
    getTables(connectionId: string): Promise<TableInfo[]>;
    getColumns(connectionId: string, tableId: string): Promise<ColumnInfo[]>;
    getForeignKeys(connectionId: string): Promise<ForeignKeyRelation[]>;
    buildSchemaTree(connectionId: string, options: SchemaTreeOptions): Promise<SchemaNode[]>;
  };
  stats: {
    fetchSampleStats(connectionId: string, columns: string[]): Promise<FieldSampleData[]>;
    fetchCardinality(connectionId: string, tableId: string): Promise<CardinalityStats>;
    getRowCount(connectionId: string, tableId: string): Promise<number>;
  };
  files: {
    chooseOutputDir(): Promise<string | null>;
    savePackage(files: PackageFiles, outputDir: string): Promise<SaveResult>;
  };
}
