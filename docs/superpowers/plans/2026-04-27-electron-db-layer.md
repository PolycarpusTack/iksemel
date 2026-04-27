# Electron Database Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full database backend to the XFEB Electron app — PostgreSQL and Oracle drivers, IPC handlers, profile persistence with encrypted passwords, schema-tree builder, and a `DatabaseProvider` that feeds real row statistics into the existing size estimator.

**Architecture:** All database work lives in the Electron main process (`electron/main/`). The renderer never touches `pg` or `oracledb` — it only calls `window.electronAPI` methods defined in the preload context bridge. Pure utility functions (type mapper, cycle detector, schema builder) are isolated in `electron/main/db/` so they can be unit-tested without a running database. IPC handlers in `electron/main/ipc/` wire those utilities to `ipcMain` channels. A `DatabaseProvider` in `src/engine/provider/` implements the existing `DataProvider` interface so the estimation engine needs no changes.

**Tech Stack:** `pg` + `@types/pg` (PostgreSQL), `oracledb` + `@types/oracledb` (Oracle), Electron `safeStorage` (credential encryption), Vitest (unit tests — all electron tests use `// @vitest-environment node`), Node.js `fs.promises` + `os` (profile file I/O).

---

## File Map

**New files:**
- `electron/main/profiles.ts` — read/write `~/.xfeb/profiles.json`; password encrypt/decrypt via `safeStorage`
- `electron/main/db/type-mapper.ts` — pure: DB column type string → XSD type string
- `electron/main/db/cycle-detector.ts` — pure: DFS cycle detection over FK graph
- `electron/main/db/schema-builder.ts` — pure: tables + columns + FK decisions → `SchemaNode[]`
- `electron/main/db/pg-driver.ts` — `PgDriver` class: connect/disconnect/introspect/stats via `pg.Pool`
- `electron/main/db/oracle-driver.ts` — `OracleDriver` class: same interface via `oracledb`
- `electron/main/ipc/connections.ts` — `registerConnectionHandlers(ipcMain)`: 7 channels
- `electron/main/ipc/schema.ts` — `registerSchemaHandlers(ipcMain)`: 4 channels
- `electron/main/ipc/stats.ts` — `registerStatsHandlers(ipcMain)`: 3 channels
- `electron/main/ipc/files.ts` — `registerFilesHandlers(ipcMain)`: 2 channels
- `src/engine/provider/database-provider.ts` — implements `DataProvider` using `window.electronAPI`
- `electron/main/db/pg-driver.test.ts` — unit tests for `PgDriver` (mocked `pg`)
- `electron/main/db/oracle-driver.test.ts` — unit tests for `OracleDriver` (mocked `oracledb`)
- `electron/main/db/type-mapper.test.ts` — full coverage of all type mappings
- `electron/main/db/cycle-detector.test.ts` — cycle / self-ref / composite FK cases
- `electron/main/db/schema-builder.test.ts` — schema tree construction
- `electron/main/profiles.test.ts` — profile CRUD with mocked `safeStorage` + temp dir
- `electron/main/ipc/connections.test.ts` — IPC handler unit tests
- `electron/main/ipc/schema.test.ts` — IPC handler unit tests
- `electron/main/ipc/stats.test.ts` — IPC handler unit tests (timeout path included)
- `electron/main/ipc/files.test.ts` — IPC handler unit tests (dialog + writeFile)
- `src/engine/provider/database-provider.test.ts` — unit tests with mocked `window.electronAPI`

**Modified files:**
- `electron/preload/api.ts` — replace empty `ElectronAPI` with full typed interface + all supporting types
- `electron/preload/index.ts` — wire every `electronAPI` method to `ipcRenderer.invoke`
- `electron/main/index.ts` — call all `register*Handlers(ipcMain)` inside `app.whenReady()`
- `vitest.config.ts` — add `electron/**/*.{test,spec}.ts` to `include`

---

## Task 1: Install deps + update vitest config

**Files:**
- Modify: `Iksemel/package.json`
- Modify: `Iksemel/vitest.config.ts`

- [ ] **Step 1: Install database driver packages**

Run from `Iksemel/`:

```bash
npm install --save-dev pg @types/pg oracledb @types/oracledb
```

Expected: packages added to `devDependencies` in `package.json` and `package-lock.json` updated. No peer-dep errors.

- [ ] **Step 2: Update vitest config to include electron tests**

Replace the `include` line in `Iksemel/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@engine": resolve(__dirname, "src/engine"),
      "@components": resolve(__dirname, "src/components"),
      "@types": resolve(__dirname, "src/types"),
      "@utils": resolve(__dirname, "src/utils"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "electron/**/*.{test,spec}.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

- [ ] **Step 3: Verify baseline is unchanged**

```bash
npx vitest run
```

Expected output (last lines):
```
 Test Files  2 failed | 39 passed (41)
      Tests  4 failed | 568 passed (572)
```

The 4 golden failures are pre-existing and unrelated to this plan.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: install pg + oracledb drivers; expand vitest to include electron tests"
```

---

## Task 2: Define IPC types in `electron/preload/api.ts` + wire `electron/preload/index.ts`

**Files:**
- Modify: `electron/preload/api.ts`
- Modify: `electron/preload/index.ts`

- [ ] **Step 1: Replace `api.ts` with the full typed interface**

`electron/preload/api.ts` cannot import from `src/` (excluded by `tsconfig.electron.json`), so all shared types are defined inline here.

```typescript
// electron/preload/api.ts
//
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
```

- [ ] **Step 2: Wire `index.ts` — replace the empty `{}` with full `ipcRenderer.invoke` calls**

```typescript
// electron/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "./api";

const api: ElectronAPI = {
  connections: {
    testConnection: (profile) =>
      ipcRenderer.invoke("connections:testConnection", profile),
    connect: (profileId) =>
      ipcRenderer.invoke("connections:connect", profileId),
    disconnect: (connectionId) =>
      ipcRenderer.invoke("connections:disconnect", connectionId),
    listProfiles: () =>
      ipcRenderer.invoke("connections:listProfiles"),
    saveProfile: (profile) =>
      ipcRenderer.invoke("connections:saveProfile", profile),
    deleteProfile: (profileId) =>
      ipcRenderer.invoke("connections:deleteProfile", profileId),
    setFavourite: (profileId, favourite) =>
      ipcRenderer.invoke("connections:setFavourite", profileId, favourite),
  },
  schema: {
    getTables: (connectionId) =>
      ipcRenderer.invoke("schema:getTables", connectionId),
    getColumns: (connectionId, tableId) =>
      ipcRenderer.invoke("schema:getColumns", connectionId, tableId),
    getForeignKeys: (connectionId) =>
      ipcRenderer.invoke("schema:getForeignKeys", connectionId),
    buildSchemaTree: (connectionId, options) =>
      ipcRenderer.invoke("schema:buildSchemaTree", connectionId, options),
  },
  stats: {
    fetchSampleStats: (connectionId, columns) =>
      ipcRenderer.invoke("stats:fetchSampleStats", connectionId, columns),
    fetchCardinality: (connectionId, tableId) =>
      ipcRenderer.invoke("stats:fetchCardinality", connectionId, tableId),
    getRowCount: (connectionId, tableId) =>
      ipcRenderer.invoke("stats:getRowCount", connectionId, tableId),
  },
  files: {
    chooseOutputDir: () =>
      ipcRenderer.invoke("files:chooseOutputDir"),
    savePackage: (files, outputDir) =>
      ipcRenderer.invoke("files:savePackage", files, outputDir),
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
```

- [ ] **Step 3: Type-check the electron build**

```bash
npx tsc --project tsconfig.electron.json --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add electron/preload/api.ts electron/preload/index.ts
git commit -m "feat(preload): define full ElectronAPI interface and wire ipcRenderer.invoke channels"
```

---

## Task 3: Profile persistence (`electron/main/profiles.ts`)

**Files:**
- Create: `electron/main/profiles.ts`
- Create: `electron/main/profiles.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// electron/main/profiles.test.ts
// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Mock safeStorage before importing profiles
vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn((s: string) => Buffer.from(`enc:${s}`)),
    decryptString: vi.fn((b: Buffer) => b.toString().replace(/^enc:/, "")),
  },
  app: {
    getPath: vi.fn().mockReturnValue("/tmp/xfeb-test"),
  },
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xfeb-profiles-"));
  // Re-point the module to use the temp dir
  vi.doMock("../main/profiles", async () => {
    const mod = await import("./profiles");
    return mod;
  });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.resetModules();
});

describe("profiles", () => {
  it("returns empty array when profiles.json does not exist", async () => {
    const { loadProfiles } = await import("./profiles");
    const profiles = await loadProfiles(tmpDir);
    expect(profiles).toEqual([]);
  });

  it("saveProfile creates a new profile with encrypted password", async () => {
    const { saveProfile, loadProfiles } = await import("./profiles");
    const input = {
      label: "My PG",
      engine: "postgres" as const,
      host: "localhost",
      port: 5432,
      database: "mydb",
      username: "pguser",
      password: "secret",
      schemas: ["public"],
    };
    const saved = await saveProfile(input, tmpDir);
    expect(saved.id).toBeTruthy();
    expect(saved.label).toBe("My PG");
    expect((saved as any).password).toBeUndefined();

    const profilesOnDisk = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "profiles.json"), "utf8"),
    );
    expect(profilesOnDisk[0].encryptedPassword).toBeTruthy();
    expect(profilesOnDisk[0].encryptedPassword).not.toBe("secret");

    const loaded = await loadProfiles(tmpDir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].label).toBe("My PG");
  });

  it("saveProfile updates existing profile when id matches", async () => {
    const { saveProfile, loadProfiles } = await import("./profiles");
    const input = {
      label: "Old",
      engine: "postgres" as const,
      host: "localhost",
      port: 5432,
      database: "db",
      username: "u",
      password: "pw",
      schemas: ["public"],
    };
    const created = await saveProfile(input, tmpDir);
    await saveProfile({ ...input, label: "Updated", id: created.id } as any, tmpDir);
    const profiles = await loadProfiles(tmpDir);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].label).toBe("Updated");
  });

  it("deleteProfile removes the profile", async () => {
    const { saveProfile, deleteProfile, loadProfiles } = await import("./profiles");
    const created = await saveProfile({
      label: "ToDelete",
      engine: "postgres" as const,
      host: "h",
      port: 5432,
      database: "d",
      username: "u",
      password: "pw",
      schemas: ["public"],
    }, tmpDir);
    await deleteProfile(created.id, tmpDir);
    const profiles = await loadProfiles(tmpDir);
    expect(profiles).toHaveLength(0);
  });

  it("setFavourite toggles isFavourite", async () => {
    const { saveProfile, setFavourite, loadProfiles } = await import("./profiles");
    const created = await saveProfile({
      label: "Fav",
      engine: "postgres" as const,
      host: "h",
      port: 5432,
      database: "d",
      username: "u",
      password: "pw",
      schemas: ["public"],
    }, tmpDir);
    await setFavourite(created.id, true, tmpDir);
    const profiles = await loadProfiles(tmpDir);
    expect(profiles[0].isFavourite).toBe(true);
    await setFavourite(created.id, false, tmpDir);
    const after = await loadProfiles(tmpDir);
    expect(after[0].isFavourite).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run electron/main/profiles.test.ts
```

Expected: FAIL — `Cannot find module './profiles'`.

- [ ] **Step 3: Implement `profiles.ts`**

```typescript
// electron/main/profiles.ts
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { safeStorage } from "electron";
import type {
  ConnectionProfile,
  ConnectionProfileInput,
  SchemaConfig,
} from "../preload/api";

const PROFILES_FILE = "profiles.json";

// On-disk shape includes encrypted password as hex string
interface StoredProfile extends Omit<ConnectionProfile, never> {
  encryptedPassword: string; // hex-encoded encrypted buffer
  isFavourite?: boolean;
  schemaConfig?: SchemaConfig;
}

function defaultXfebDir(): string {
  const home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? ".";
  return path.join(home, ".xfeb");
}

function profilesPath(dir: string): string {
  return path.join(dir, PROFILES_FILE);
}

async function readStoredProfiles(dir: string): Promise<StoredProfile[]> {
  const filePath = profilesPath(dir);
  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(raw) as StoredProfile[];
  } catch {
    return [];
  }
}

async function writeStoredProfiles(dir: string, profiles: StoredProfile[]): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(profilesPath(dir), JSON.stringify(profiles, null, 2), "utf8");
}

export async function loadProfiles(dir: string = defaultXfebDir()): Promise<ConnectionProfile[]> {
  const stored = await readStoredProfiles(dir);
  return stored.map(({ encryptedPassword: _enc, ...rest }) => rest as ConnectionProfile);
}

export async function saveProfile(
  input: ConnectionProfileInput & { id?: string },
  dir: string = defaultXfebDir(),
): Promise<ConnectionProfile> {
  const stored = await readStoredProfiles(dir);

  const encryptedBuffer = safeStorage.encryptString(input.password);
  const encryptedPassword = encryptedBuffer.toString("hex");

  const existingIndex = input.id ? stored.findIndex((p) => p.id === input.id) : -1;

  const { password: _pw, ...rest } = input;
  const now = Date.now();

  if (existingIndex >= 0) {
    stored[existingIndex] = {
      ...stored[existingIndex],
      ...rest,
      encryptedPassword,
    };
    await writeStoredProfiles(dir, stored);
    const { encryptedPassword: _e, ...profile } = stored[existingIndex];
    return profile as ConnectionProfile;
  }

  const newProfile: StoredProfile = {
    ...rest,
    id: crypto.randomUUID(),
    createdAt: now,
    encryptedPassword,
    engine: input.engine,
    label: input.label,
    host: input.host,
    port: input.port,
    database: input.database,
    username: input.username,
    schemas: input.schemas,
  };
  stored.push(newProfile);
  await writeStoredProfiles(dir, stored);
  const { encryptedPassword: _e, ...profile } = newProfile;
  return profile as ConnectionProfile;
}

export async function deleteProfile(id: string, dir: string = defaultXfebDir()): Promise<void> {
  const stored = await readStoredProfiles(dir);
  const updated = stored.filter((p) => p.id !== id);
  await writeStoredProfiles(dir, updated);
}

export async function setFavourite(
  id: string,
  favourite: boolean,
  dir: string = defaultXfebDir(),
): Promise<void> {
  const stored = await readStoredProfiles(dir);
  const idx = stored.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error(`Profile not found: ${id}`);
  stored[idx] = { ...stored[idx], isFavourite: favourite };
  await writeStoredProfiles(dir, stored);
}

/** Returns the decrypted password for a stored profile — used by drivers only */
export async function getPassword(id: string, dir: string = defaultXfebDir()): Promise<string> {
  const stored = await readStoredProfiles(dir);
  const profile = stored.find((p) => p.id === id);
  if (!profile) throw new Error(`Profile not found: ${id}`);
  const buf = Buffer.from(profile.encryptedPassword, "hex");
  return safeStorage.decryptString(buf);
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run electron/main/profiles.test.ts
```

Expected:
```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

- [ ] **Step 5: Commit**

```bash
git add electron/main/profiles.ts electron/main/profiles.test.ts
git commit -m "feat(electron): profile persistence with safeStorage-encrypted passwords"
```

---

## Task 4: DB type mapper (`electron/main/db/type-mapper.ts`)

**Files:**
- Create: `electron/main/db/type-mapper.ts`
- Create: `electron/main/db/type-mapper.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// electron/main/db/type-mapper.test.ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mapDbTypeToXsdType } from "./type-mapper";

describe("mapDbTypeToXsdType — postgres", () => {
  const pg = "postgres" as const;

  it.each([
    ["VARCHAR", "xs:string"],
    ["VARCHAR(255)", "xs:string"],
    ["CHAR(10)", "xs:string"],
    ["TEXT", "xs:string"],
    ["NVARCHAR", "xs:string"],
    ["CHARACTER VARYING", "xs:string"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, pg)).toBe(expected);
  });

  it.each([
    ["INTEGER", "xs:integer"],
    ["INT", "xs:integer"],
    ["INT4", "xs:integer"],
    ["SMALLINT", "xs:integer"],
    ["BIGINT", "xs:integer"],
    ["INT8", "xs:integer"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, pg)).toBe(expected);
  });

  it.each([
    ["NUMERIC", "xs:decimal"],
    ["NUMERIC(10,2)", "xs:decimal"],
    ["DECIMAL", "xs:decimal"],
    ["DECIMAL(8,3)", "xs:decimal"],
    ["FLOAT", "xs:decimal"],
    ["FLOAT8", "xs:decimal"],
    ["DOUBLE PRECISION", "xs:decimal"],
    ["REAL", "xs:decimal"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, pg)).toBe(expected);
  });

  it("maps BOOLEAN → xs:boolean", () => {
    expect(mapDbTypeToXsdType("BOOLEAN", pg)).toBe("xs:boolean");
  });

  it("maps BOOL → xs:boolean", () => {
    expect(mapDbTypeToXsdType("BOOL", pg)).toBe("xs:boolean");
  });

  it("maps DATE → xs:date (PG DATE has no time component)", () => {
    expect(mapDbTypeToXsdType("DATE", pg)).toBe("xs:date");
  });

  it.each([
    ["TIMESTAMP", "xs:dateTime"],
    ["TIMESTAMP WITH TIME ZONE", "xs:dateTime"],
    ["TIMESTAMPTZ", "xs:dateTime"],
    ["DATETIME", "xs:dateTime"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, pg)).toBe(expected);
  });

  it.each([
    ["BYTEA", null],
    ["OID", null],
  ])("maps %s → null (excluded)", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, pg)).toBeNull();
  });

  it("returns xs:string for unknown types", () => {
    expect(mapDbTypeToXsdType("CUSTOM_TYPE", pg)).toBe("xs:string");
  });
});

describe("mapDbTypeToXsdType — oracle", () => {
  const ora = "oracle" as const;

  it.each([
    ["VARCHAR2", "xs:string"],
    ["VARCHAR2(100)", "xs:string"],
    ["CHAR", "xs:string"],
    ["NVARCHAR2", "xs:string"],
    ["NCHAR", "xs:string"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, ora)).toBe(expected);
  });

  it.each([
    ["NUMBER", "xs:decimal"],
    ["NUMBER(10)", "xs:decimal"],
    ["NUMBER(10,2)", "xs:decimal"],
    ["FLOAT", "xs:decimal"],
    ["BINARY_FLOAT", "xs:decimal"],
    ["BINARY_DOUBLE", "xs:decimal"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, ora)).toBe(expected);
  });

  it("maps INTEGER → xs:integer for Oracle", () => {
    expect(mapDbTypeToXsdType("INTEGER", ora)).toBe("xs:integer");
  });

  it("maps DATE → xs:dateTime for Oracle (Oracle DATE includes time)", () => {
    expect(mapDbTypeToXsdType("DATE", ora)).toBe("xs:dateTime");
  });

  it.each([
    ["TIMESTAMP", "xs:dateTime"],
    ["TIMESTAMP WITH TIME ZONE", "xs:dateTime"],
    ["TIMESTAMP WITH LOCAL TIME ZONE", "xs:dateTime"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, ora)).toBe(expected);
  });

  it.each([
    ["CLOB", null],
    ["NCLOB", null],
    ["BLOB", null],
    ["RAW", null],
    ["LONG RAW", null],
  ])("maps %s → null (excluded)", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, ora)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run electron/main/db/type-mapper.test.ts
```

Expected: FAIL — `Cannot find module './type-mapper'`.

- [ ] **Step 3: Implement `type-mapper.ts`**

```typescript
// electron/main/db/type-mapper.ts
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run electron/main/db/type-mapper.test.ts
```

Expected:
```
 Test Files  1 passed (1)
      Tests  38 passed (38)
```

- [ ] **Step 5: Commit**

```bash
git add electron/main/db/type-mapper.ts electron/main/db/type-mapper.test.ts
git commit -m "feat(electron): DB column type → XSD type mapper with full coverage"
```

---

## Task 5: FK cycle detector (`electron/main/db/cycle-detector.ts`)

**Files:**
- Create: `electron/main/db/cycle-detector.ts`
- Create: `electron/main/db/cycle-detector.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// electron/main/db/cycle-detector.test.ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { detectCycles } from "./cycle-detector";
import type { ForeignKeyRelation } from "../../preload/api";

function fk(
  fkId: string,
  from: string,
  to: string,
  extra: Partial<ForeignKeyRelation> = {},
): ForeignKeyRelation {
  return {
    fkId,
    fromTableId: from,
    fromColumn: "id",
    toTableId: to,
    toColumn: "id",
    isComposite: false,
    isSelfRef: from === to,
    isCircular: false,
    ...extra,
  };
}

describe("detectCycles", () => {
  it("returns empty array for empty input", () => {
    expect(detectCycles([])).toEqual([]);
  });

  it("does not mark a straight chain A→B→C as circular", () => {
    const fks = [fk("f1", "A", "B"), fk("f2", "B", "C")];
    const result = detectCycles(fks);
    expect(result.every((f) => !f.isCircular)).toBe(true);
  });

  it("marks the closing edge in A→B→C→A as circular", () => {
    const fks = [fk("f1", "A", "B"), fk("f2", "B", "C"), fk("f3", "C", "A")];
    const result = detectCycles(fks);
    const circular = result.filter((f) => f.isCircular);
    expect(circular).toHaveLength(1);
    expect(circular[0].fkId).toBe("f3");
  });

  it("marks the closing edge in A→B, B→A (two-node cycle)", () => {
    const fks = [fk("f1", "A", "B"), fk("f2", "B", "A")];
    const result = detectCycles(fks);
    const circular = result.filter((f) => f.isCircular);
    expect(circular).toHaveLength(1);
    expect(circular[0].fkId).toBe("f2");
  });

  it("marks self-referential FK (A→A) as circular", () => {
    const fks = [fk("f1", "A", "A", { isSelfRef: true })];
    const result = detectCycles(fks);
    // Self-ref is circular but handled separately in UI — still flagged
    expect(result[0].isCircular).toBe(true);
  });

  it("handles two independent cycles without cross-contamination", () => {
    const fks = [
      fk("f1", "A", "B"),
      fk("f2", "B", "A"), // cycle 1
      fk("f3", "C", "D"),
      fk("f4", "D", "C"), // cycle 2
      fk("f5", "E", "F"), // no cycle
    ];
    const result = detectCycles(fks);
    const circular = result.filter((f) => f.isCircular).map((f) => f.fkId);
    expect(circular).toContain("f2");
    expect(circular).toContain("f4");
    expect(circular).not.toContain("f1");
    expect(circular).not.toContain("f3");
    expect(circular).not.toContain("f5");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run electron/main/db/cycle-detector.test.ts
```

Expected: FAIL — `Cannot find module './cycle-detector'`.

- [ ] **Step 3: Implement `cycle-detector.ts`**

```typescript
// electron/main/db/cycle-detector.ts
import type { ForeignKeyRelation } from "../../preload/api";

/**
 * Runs DFS over the FK graph and marks the edge that closes each cycle
 * as `isCircular: true`. Returns a new array (input is not mutated).
 *
 * Only the back-edge (the edge that points to an ancestor in the current DFS
 * path) is marked — not all edges in the cycle.
 */
export function detectCycles(fks: ForeignKeyRelation[]): ForeignKeyRelation[] {
  // Build adjacency: fromTableId → list of {toTableId, fkId}
  const adj = new Map<string, { toTableId: string; fkId: string }[]>();
  for (const fk of fks) {
    if (!adj.has(fk.fromTableId)) adj.set(fk.fromTableId, []);
    adj.get(fk.fromTableId)!.push({ toTableId: fk.toTableId, fkId: fk.fkId });
  }

  const circularFkIds = new Set<string>();
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): void {
    if (inStack.has(node)) return;
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);

    for (const edge of adj.get(node) ?? []) {
      if (inStack.has(edge.toTableId)) {
        // Back-edge: this closes a cycle
        circularFkIds.add(edge.fkId);
      } else if (!visited.has(edge.toTableId)) {
        dfs(edge.toTableId);
      }
    }

    inStack.delete(node);
  }

  // Self-references
  for (const fk of fks) {
    if (fk.fromTableId === fk.toTableId) {
      circularFkIds.add(fk.fkId);
    }
  }

  const allTables = new Set(fks.flatMap((f) => [f.fromTableId, f.toTableId]));
  for (const table of allTables) {
    if (!visited.has(table)) {
      dfs(table);
    }
  }

  return fks.map((fk) =>
    circularFkIds.has(fk.fkId) ? { ...fk, isCircular: true } : fk,
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run electron/main/db/cycle-detector.test.ts
```

Expected:
```
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

- [ ] **Step 5: Commit**

```bash
git add electron/main/db/cycle-detector.ts electron/main/db/cycle-detector.test.ts
git commit -m "feat(electron): DFS FK cycle detector — marks closing back-edge as circular"
```

---

## Task 6: Schema builder (`electron/main/db/schema-builder.ts`)

**Files:**
- Create: `electron/main/db/schema-builder.ts`
- Create: `electron/main/db/schema-builder.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// electron/main/db/schema-builder.test.ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run electron/main/db/schema-builder.test.ts
```

Expected: FAIL — `Cannot find module './schema-builder'`.

- [ ] **Step 3: Implement `schema-builder.ts`**

```typescript
// electron/main/db/schema-builder.ts
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

// XML names that must be prefixed to avoid conflicts
const RESERVED_XML_NAMES = new Set([
  "xml", "xsl", "xslt", "xmlns", "xlink",
  "type", "id", "lang", "base", "space",
]);

let nodeCounter = 0;
function nextId(): string {
  return `n${nodeCounter++}`;
}

function sanitiseColumnName(colName: string, tableName: string): string {
  const lower = colName.toLowerCase();
  if (RESERVED_XML_NAMES.has(lower)) {
    return `${tableName}_${lower}`;
  }
  return lower;
}

function buildColumnNode(col: ColumnInfo, tableName: string, engine: DbEngine): SchemaNode | null {
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
): SchemaNode {
  const tableCols = columns.get(table.tableId) ?? [];
  const children: SchemaNode[] = [];
  for (const col of tableCols) {
    const node = buildColumnNode(col, table.name, engine);
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
  nodeCounter = 0;

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
          children.push(buildNestedTableNode(childTable, columns, engine));
        }
      } else {
        const node = buildColumnNode(col, table.name, engine);
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run electron/main/db/schema-builder.test.ts
```

Expected:
```
 Test Files  1 passed (1)
      Tests  10 passed (10)
```

- [ ] **Step 5: Commit**

```bash
git add electron/main/db/schema-builder.ts electron/main/db/schema-builder.test.ts
git commit -m "feat(electron): schema tree builder — tables + FK decisions → SchemaNode[]"
```

---

## Task 7: PostgreSQL driver (`electron/main/db/pg-driver.ts`)

**Files:**
- Create: `electron/main/db/pg-driver.ts`
- Create: `electron/main/db/pg-driver.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// electron/main/db/pg-driver.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pg before importing the driver
const mockQuery = vi.fn();
const mockEnd = vi.fn().mockResolvedValue(undefined);
const mockPoolInstance = { query: mockQuery, end: mockEnd };
const MockPool = vi.fn().mockImplementation(() => mockPoolInstance);

vi.mock("pg", () => ({ Pool: MockPool }));

import { PgDriver } from "./pg-driver";
import type { ConnectionProfileInput } from "../../preload/api";

const profile: ConnectionProfileInput = {
  label: "test",
  engine: "postgres",
  host: "localhost",
  port: 5432,
  database: "testdb",
  username: "pguser",
  password: "secret",
  schemas: ["public"],
  sslMode: "disable",
};

beforeEach(() => {
  vi.clearAllMocks();
  MockPool.mockImplementation(() => mockPoolInstance);
});

describe("PgDriver.connect", () => {
  it("creates a Pool with correct config", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ now: new Date() }] }); // ping
    const driver = new PgDriver();
    await driver.connect(profile);
    expect(MockPool).toHaveBeenCalledOnce();
    const poolConfig = MockPool.mock.calls[0][0];
    expect(poolConfig.host).toBe("localhost");
    expect(poolConfig.port).toBe(5432);
    expect(poolConfig.database).toBe("testdb");
    expect(poolConfig.user).toBe("pguser");
    expect(poolConfig.password).toBe("secret");
    expect(poolConfig.max).toBe(3);
    expect(poolConfig.idleTimeoutMillis).toBe(30000);
  });

  it("throws on ping failure", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));
    const driver = new PgDriver();
    await expect(driver.connect(profile)).rejects.toThrow("connection refused");
  });
});

describe("PgDriver.disconnect", () => {
  it("calls pool.end()", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });
    const driver = new PgDriver();
    await driver.connect(profile);
    await driver.disconnect();
    expect(mockEnd).toHaveBeenCalledOnce();
  });
});

describe("PgDriver.getTables", () => {
  it("returns TABLE and VIEW rows from information_schema", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // connect ping
    mockQuery.mockResolvedValueOnce({
      rows: [
        { table_schema: "public", table_name: "programme", table_type: "BASE TABLE", row_count: "1234" },
        { table_schema: "public", table_name: "v_summary", table_type: "VIEW", row_count: null },
      ],
    });
    const driver = new PgDriver();
    await driver.connect(profile);
    const tables = await driver.getTables();
    expect(tables).toHaveLength(2);
    expect(tables[0].tableId).toBe("public.programme");
    expect(tables[0].type).toBe("TABLE");
    expect(tables[1].type).toBe("VIEW");
    expect(tables[0].rowCount).toBe(1234);
  });
});

describe("PgDriver.getColumns", () => {
  it("returns ColumnInfo array for a table", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // connect ping
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          column_name: "id",
          data_type: "integer",
          is_nullable: "NO",
          is_pk: true,
        },
        {
          column_name: "title",
          data_type: "character varying",
          is_nullable: "NO",
          is_pk: false,
        },
      ],
    });
    const driver = new PgDriver();
    await driver.connect(profile);
    const cols = await driver.getColumns("public.programme");
    expect(cols).toHaveLength(2);
    expect(cols[0].name).toBe("id");
    expect(cols[0].isPrimaryKey).toBe(true);
    expect(cols[1].nullable).toBe(false);
  });
});

describe("PgDriver.getForeignKeys", () => {
  it("returns ForeignKeyRelation array", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // connect ping
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          constraint_name: "fk_prog_genre",
          from_schema: "public",
          from_table: "programme",
          from_column: "genre_id",
          to_schema: "public",
          to_table: "genre",
          to_column: "id",
          is_composite: false,
        },
      ],
    });
    const driver = new PgDriver();
    await driver.connect(profile);
    const fks = await driver.getForeignKeys();
    expect(fks).toHaveLength(1);
    expect(fks[0].fkId).toBe("fk_prog_genre");
    expect(fks[0].fromTableId).toBe("public.programme");
    expect(fks[0].toTableId).toBe("public.genre");
    expect(fks[0].isSelfRef).toBe(false);
    expect(fks[0].isCircular).toBe(false);
  });
});

describe("PgDriver.getRowCount", () => {
  it("returns integer row count", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // connect
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "42" }] });
    const driver = new PgDriver();
    await driver.connect(profile);
    const count = await driver.getRowCount("public.programme");
    expect(count).toBe(42);
  });
});

describe("PgDriver SSL", () => {
  it("sets ssl: false when sslMode is disable", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });
    const driver = new PgDriver();
    await driver.connect({ ...profile, sslMode: "disable" });
    const poolConfig = MockPool.mock.calls[0][0];
    expect(poolConfig.ssl).toBe(false);
  });

  it("sets ssl: { rejectUnauthorized: true } when sslMode is require", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });
    const driver = new PgDriver();
    await driver.connect({ ...profile, sslMode: "require" });
    const poolConfig = MockPool.mock.calls[0][0];
    expect(poolConfig.ssl).toEqual({ rejectUnauthorized: false });
  });

  it("sets ssl: { rejectUnauthorized: true } when sslMode is verify-full", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });
    const driver = new PgDriver();
    await driver.connect({ ...profile, sslMode: "verify-full" });
    const poolConfig = MockPool.mock.calls[0][0];
    expect(poolConfig.ssl).toEqual({ rejectUnauthorized: true });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run electron/main/db/pg-driver.test.ts
```

Expected: FAIL — `Cannot find module './pg-driver'`.

- [ ] **Step 3: Implement `pg-driver.ts`**

```typescript
// electron/main/db/pg-driver.ts
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
      ssl: sslConfig,
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
    const [schema, tableName] = tableId.split(".");
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
             COUNT(DISTINCT ${column}) AS distinct_count,
             COUNT(*) - COUNT(${column}) AS null_count,
             json_agg(json_build_object('value', ${column}::text, 'count', cnt) ORDER BY cnt DESC)
               FILTER (WHERE rn <= 20) AS top_values
           FROM (
             SELECT ${column}, COUNT(*) AS cnt,
                    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rn
             FROM ${schema}.${table} TABLESAMPLE SYSTEM(10)
             GROUP BY ${column}
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
    const [schema, table] = tableId.split(".");
    const result = await pool.query(
      `SELECT COUNT(*)::text AS count FROM ${schema}.${table}`,
    );
    return parseInt(result.rows[0].count, 10);
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run electron/main/db/pg-driver.test.ts
```

Expected:
```
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

- [ ] **Step 5: Commit**

```bash
git add electron/main/db/pg-driver.ts electron/main/db/pg-driver.test.ts
git commit -m "feat(electron): PgDriver — PostgreSQL introspection and stats via pg.Pool"
```

---

## Task 8: Oracle driver (`electron/main/db/oracle-driver.ts`)

**Files:**
- Create: `electron/main/db/oracle-driver.ts`
- Create: `electron/main/db/oracle-driver.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// electron/main/db/oracle-driver.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecute = vi.fn();
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockConnectionInstance = { execute: mockExecute, close: mockClose };
const mockGetConnection = vi.fn().mockResolvedValue(mockConnectionInstance);

vi.mock("oracledb", () => ({
  default: {
    getConnection: mockGetConnection,
    initOracleClient: vi.fn(),
    OUT_FORMAT_OBJECT: 4002,
  },
}));

import { OracleDriver, OracleClientMissingError } from "./oracle-driver";
import type { ConnectionProfileInput } from "../../preload/api";

const profile: ConnectionProfileInput = {
  label: "test",
  engine: "oracle",
  host: "orahost",
  port: 1521,
  database: "ORCL",
  username: "hr",
  password: "hr_pass",
  schemas: ["HR"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConnection.mockResolvedValue(mockConnectionInstance);
});

describe("OracleDriver.connect", () => {
  it("calls initOracleClient and getConnection with Easy Connect string", async () => {
    const oracledb = (await import("oracledb")).default;
    mockExecute.mockResolvedValueOnce({ rows: [] }); // ping
    const driver = new OracleDriver();
    await driver.connect(profile);
    expect(oracledb.initOracleClient).toHaveBeenCalledOnce();
    expect(mockGetConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        user: "hr",
        password: "hr_pass",
        connectString: "orahost:1521/ORCL",
      }),
    );
  });

  it("uses TNS alias when tnsAlias is provided", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const driver = new OracleDriver();
    await driver.connect({ ...profile, tnsAlias: "MY_TNS" });
    expect(mockGetConnection).toHaveBeenCalledWith(
      expect.objectContaining({ connectString: "MY_TNS" }),
    );
  });

  it("throws OracleClientMissingError when initOracleClient fails", async () => {
    const oracledb = (await import("oracledb")).default;
    (oracledb.initOracleClient as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("DPI-1047: Cannot locate a 64-bit Oracle Client library");
    });
    const driver = new OracleDriver();
    await expect(driver.connect(profile)).rejects.toThrow(OracleClientMissingError);
  });
});

describe("OracleDriver.getTables", () => {
  it("returns tables filtered to selected schema, normalised to lowercase", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // ping
    mockExecute.mockResolvedValueOnce({
      rows: [
        { OWNER: "HR", TABLE_NAME: "EMPLOYEES", OBJECT_TYPE: "TABLE", NUM_ROWS: 107 },
        { OWNER: "HR", TABLE_NAME: "V_EMP", OBJECT_TYPE: "VIEW", NUM_ROWS: null },
      ],
    });
    const driver = new OracleDriver();
    await driver.connect(profile);
    const tables = await driver.getTables();
    expect(tables).toHaveLength(2);
    expect(tables[0].name).toBe("employees"); // normalised lowercase
    expect(tables[0].tableId).toBe("hr.employees");
    expect(tables[1].type).toBe("VIEW");
  });
});

describe("OracleDriver.getColumns", () => {
  it("returns ColumnInfo with normalised names, excludes CLOB/BLOB", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // ping
    mockExecute.mockResolvedValueOnce({
      rows: [
        { COLUMN_NAME: "EMPLOYEE_ID", DATA_TYPE: "NUMBER", NULLABLE: "N", IS_PK: 1 },
        { COLUMN_NAME: "FIRST_NAME", DATA_TYPE: "VARCHAR2", NULLABLE: "Y", IS_PK: 0 },
        { COLUMN_NAME: "RESUME", DATA_TYPE: "CLOB", NULLABLE: "Y", IS_PK: 0 },
      ],
    });
    const driver = new OracleDriver();
    await driver.connect(profile);
    const cols = await driver.getColumns("hr.employees");
    // CLOB should be excluded by the driver before returning
    expect(cols).toHaveLength(2);
    expect(cols[0].name).toBe("employee_id"); // lowercase
    expect(cols[0].isPrimaryKey).toBe(true);
    expect(cols[1].nullable).toBe(true);
  });
});

describe("OracleDriver.disconnect", () => {
  it("calls connection.close()", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const driver = new OracleDriver();
    await driver.connect(profile);
    await driver.disconnect();
    expect(mockClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run electron/main/db/oracle-driver.test.ts
```

Expected: FAIL — `Cannot find module './oracle-driver'`.

- [ ] **Step 3: Implement `oracle-driver.ts`**

```typescript
// electron/main/db/oracle-driver.ts
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

// System schemas that should never appear in the table list
const SYSTEM_SCHEMAS = new Set([
  "SYS", "SYSTEM", "MDSYS", "CTXSYS", "XDB", "ORDDATA",
  "ORDSYS", "DVSYS", "LBACSYS", "WMSYS", "APEX_PUBLIC_USER",
  "FLOWS_FILES", "OUTLN", "DBSNMP",
]);

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

    this.schemas = profile.schemas.length > 0
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

    const result = await conn.execute<{ OWNER: string; TABLE_NAME: string; OBJECT_TYPE: string; NUM_ROWS: number | null }>(
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
      type: row.OBJECT_TYPE === "VIEW" ? "VIEW" : "TABLE",
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
    const grouped = new Map<string, typeof result.rows>();
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
        const result = await conn.execute<{ TOTAL_COUNT: number; DISTINCT_COUNT: number; NULL_COUNT: number }>(
          `SELECT COUNT(*) AS total_count,
                  COUNT(DISTINCT ${column}) AS distinct_count,
                  SUM(CASE WHEN ${column} IS NULL THEN 1 ELSE 0 END) AS null_count
           FROM ${schema}.${table} SAMPLE(10)`,
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
      `SELECT COUNT(*) AS cnt FROM ${schema.toUpperCase()}.${table.toUpperCase()}`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows?.[0]?.CNT ?? 0;
  }

  private requireConnection(): Connection {
    if (!this.connection) throw new Error("OracleDriver: not connected");
    return this.connection;
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run electron/main/db/oracle-driver.test.ts
```

Expected:
```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

- [ ] **Step 5: Commit**

```bash
git add electron/main/db/oracle-driver.ts electron/main/db/oracle-driver.test.ts
git commit -m "feat(electron): OracleDriver — Oracle introspection and stats via oracledb"
```

---

## Task 9: Connections IPC handler (`electron/main/ipc/connections.ts`)

**Files:**
- Create: `electron/main/ipc/connections.ts`
- Create: `electron/main/ipc/connections.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// electron/main/ipc/connections.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock profiles module
vi.mock("../profiles", () => ({
  loadProfiles: vi.fn().mockResolvedValue([]),
  saveProfile: vi.fn().mockResolvedValue({ id: "p1", label: "Test", engine: "postgres", host: "localhost", port: 5432, database: "db", username: "u", schemas: ["public"], createdAt: 1000 }),
  deleteProfile: vi.fn().mockResolvedValue(undefined),
  setFavourite: vi.fn().mockResolvedValue(undefined),
  getPassword: vi.fn().mockResolvedValue("secret"),
}));

// Mock PgDriver
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);
vi.mock("../db/pg-driver", () => ({
  PgDriver: vi.fn().mockImplementation(() => ({ connect: mockConnect, disconnect: mockDisconnect })),
}));

vi.mock("../db/oracle-driver", () => ({
  OracleDriver: vi.fn().mockImplementation(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
}));

import { registerConnectionHandlers } from "./connections";

// Minimal ipcMain mock
function makeIpcMain() {
  const handlers: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  return {
    handle: vi.fn((channel: string, fn: (...args: unknown[]) => Promise<unknown>) => {
      handlers[channel] = fn;
    }),
    _invoke: async (channel: string, ...args: unknown[]) => {
      const fn = handlers[channel];
      if (!fn) throw new Error(`No handler for ${channel}`);
      return fn({}, ...args); // first arg is IpcMainInvokeEvent (mocked as {})
    },
  };
}

describe("registerConnectionHandlers", () => {
  let ipcMain: ReturnType<typeof makeIpcMain>;

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain = makeIpcMain();
    registerConnectionHandlers(ipcMain as any);
  });

  it("registers all 7 channels", () => {
    const channels = ipcMain.handle.mock.calls.map((c) => c[0]);
    expect(channels).toContain("connections:testConnection");
    expect(channels).toContain("connections:connect");
    expect(channels).toContain("connections:disconnect");
    expect(channels).toContain("connections:listProfiles");
    expect(channels).toContain("connections:saveProfile");
    expect(channels).toContain("connections:deleteProfile");
    expect(channels).toContain("connections:setFavourite");
  });

  it("listProfiles calls loadProfiles and returns result", async () => {
    const { loadProfiles } = await import("../profiles");
    (loadProfiles as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "p1", label: "Local PG", engine: "postgres", host: "localhost", port: 5432, database: "db", username: "u", schemas: ["public"], createdAt: 1000 },
    ]);
    const result = await ipcMain._invoke("connections:listProfiles");
    expect(result).toHaveLength(1);
  });

  it("connect stores driver in registry and returns connectionId", async () => {
    // First save a profile so it can be looked up
    const { loadProfiles, getPassword } = await import("../profiles");
    (loadProfiles as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", label: "Test", engine: "postgres", host: "localhost", port: 5432, database: "db", username: "u", schemas: ["public"], createdAt: 1000 },
    ]);
    (getPassword as ReturnType<typeof vi.fn>).mockResolvedValue("secret");

    const result = await ipcMain._invoke("connections:connect", "p1") as { connectionId: string };
    expect(result.connectionId).toBeTruthy();
    expect(mockConnect).toHaveBeenCalledOnce();
  });

  it("disconnect throws if connectionId unknown", async () => {
    await expect(ipcMain._invoke("connections:disconnect", "unknown-id")).rejects.toThrow();
  });

  it("testConnection returns success on connect success", async () => {
    const result = await ipcMain._invoke("connections:testConnection", {
      engine: "postgres",
      host: "localhost",
      port: 5432,
      database: "db",
      username: "u",
      password: "pw",
      schemas: ["public"],
    }) as { success: boolean };
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("latencyMs");
  });

  it("testConnection returns failure on connect error", async () => {
    mockConnect.mockRejectedValueOnce(new Error("auth failed"));
    const result = await ipcMain._invoke("connections:testConnection", {
      engine: "postgres",
      host: "localhost",
      port: 5432,
      database: "db",
      username: "u",
      password: "pw",
      schemas: ["public"],
    }) as { success: boolean; error: string };
    expect(result.success).toBe(false);
    expect(result.error).toContain("auth failed");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run electron/main/ipc/connections.test.ts
```

Expected: FAIL — `Cannot find module './connections'`.

- [ ] **Step 3: Implement `connections.ts`**

```typescript
// electron/main/ipc/connections.ts
import type { IpcMain } from "electron";
import { PgDriver } from "../db/pg-driver";
import { OracleDriver } from "../db/oracle-driver";
import {
  loadProfiles,
  saveProfile,
  deleteProfile,
  setFavourite,
  getPassword,
} from "../profiles";
import type { ConnectionProfileInput, ConnectionResult, TestResult } from "../../preload/api";
import * as crypto from "crypto";

// In-memory registry: connectionId → driver instance
const registry = new Map<string, PgDriver | OracleDriver>();

export function registerConnectionHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    "connections:testConnection",
    async (_event, profile: ConnectionProfileInput): Promise<TestResult> => {
      const driver = profile.engine === "postgres" ? new PgDriver() : new OracleDriver();
      const start = Date.now();
      try {
        await driver.connect(profile);
        await driver.disconnect();
        return { success: true, latencyMs: Date.now() - start };
      } catch (err: unknown) {
        return {
          success: false,
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  );

  ipcMain.handle(
    "connections:connect",
    async (_event, profileId: string): Promise<ConnectionResult> => {
      const profiles = await loadProfiles();
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) throw new Error(`Profile not found: ${profileId}`);

      const password = await getPassword(profileId);
      const fullProfile: ConnectionProfileInput = { ...profile, password };

      const driver = profile.engine === "postgres" ? new PgDriver() : new OracleDriver();
      await driver.connect(fullProfile);

      const connectionId = crypto.randomUUID();
      registry.set(connectionId, driver);

      return { connectionId, engine: profile.engine, profileId };
    },
  );

  ipcMain.handle(
    "connections:disconnect",
    async (_event, connectionId: string): Promise<void> => {
      const driver = registry.get(connectionId);
      if (!driver) throw new Error(`Connection not found: ${connectionId}`);
      await driver.disconnect();
      registry.delete(connectionId);
    },
  );

  ipcMain.handle("connections:listProfiles", async (): Promise<Awaited<ReturnType<typeof loadProfiles>>> => {
    return loadProfiles();
  });

  ipcMain.handle(
    "connections:saveProfile",
    async (_event, profile: ConnectionProfileInput) => {
      return saveProfile(profile);
    },
  );

  ipcMain.handle(
    "connections:deleteProfile",
    async (_event, profileId: string): Promise<void> => {
      await deleteProfile(profileId);
    },
  );

  ipcMain.handle(
    "connections:setFavourite",
    async (_event, profileId: string, favourite: boolean): Promise<void> => {
      await setFavourite(profileId, favourite);
    },
  );
}

/** Exported for use by other IPC handlers that need to resolve a connection */
export function getDriver(connectionId: string): PgDriver | OracleDriver {
  const driver = registry.get(connectionId);
  if (!driver) throw new Error(`Connection not found: ${connectionId}`);
  return driver;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run electron/main/ipc/connections.test.ts
```

Expected:
```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

- [ ] **Step 5: Commit**

```bash
git add electron/main/ipc/connections.ts electron/main/ipc/connections.test.ts
git commit -m "feat(electron): connections IPC handler — connect/disconnect/profiles/test"
```

---

## Task 10: Schema IPC handler (`electron/main/ipc/schema.ts`)

**Files:**
- Create: `electron/main/ipc/schema.ts`
- Create: `electron/main/ipc/schema.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// electron/main/ipc/schema.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTables = vi.fn().mockResolvedValue([
  { tableId: "public.programme", schema: "public", name: "programme", type: "TABLE" },
]);
const mockGetColumns = vi.fn().mockResolvedValue([
  { columnId: "c1", tableId: "public.programme", name: "id", dbType: "INTEGER", nullable: false, isPrimaryKey: true },
]);
const mockGetForeignKeys = vi.fn().mockResolvedValue([]);

vi.mock("./connections", () => ({
  getDriver: vi.fn().mockReturnValue({
    getTables: mockGetTables,
    getColumns: mockGetColumns,
    getForeignKeys: mockGetForeignKeys,
  }),
}));

import { registerSchemaHandlers } from "./schema";

function makeIpcMain() {
  const handlers: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  return {
    handle: vi.fn((channel: string, fn: (...args: unknown[]) => Promise<unknown>) => {
      handlers[channel] = fn;
    }),
    _invoke: async (channel: string, ...args: unknown[]) => {
      const fn = handlers[channel];
      if (!fn) throw new Error(`No handler for ${channel}`);
      return fn({}, ...args);
    },
  };
}

describe("registerSchemaHandlers", () => {
  let ipcMain: ReturnType<typeof makeIpcMain>;

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain = makeIpcMain();
    registerSchemaHandlers(ipcMain as any);
  });

  it("registers 4 channels", () => {
    const channels = ipcMain.handle.mock.calls.map((c) => c[0]);
    expect(channels).toContain("schema:getTables");
    expect(channels).toContain("schema:getColumns");
    expect(channels).toContain("schema:getForeignKeys");
    expect(channels).toContain("schema:buildSchemaTree");
  });

  it("getTables delegates to driver.getTables", async () => {
    const result = await ipcMain._invoke("schema:getTables", "conn-1");
    expect(mockGetTables).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
  });

  it("getColumns delegates to driver.getColumns", async () => {
    const result = await ipcMain._invoke("schema:getColumns", "conn-1", "public.programme") as unknown[];
    expect(mockGetColumns).toHaveBeenCalledWith("public.programme");
    expect(result).toHaveLength(1);
  });

  it("getForeignKeys delegates to driver.getForeignKeys", async () => {
    const result = await ipcMain._invoke("schema:getForeignKeys", "conn-1");
    expect(mockGetForeignKeys).toHaveBeenCalledOnce();
    expect(result).toEqual([]);
  });

  it("buildSchemaTree returns SchemaNode[] from driver data", async () => {
    const options = {
      selectedTableIds: ["public.programme"],
      fkDecisions: {},
      includeViews: false,
      maxSelfRefDepth: 3,
    };
    const result = await ipcMain._invoke("schema:buildSchemaTree", "conn-1", options) as unknown[];
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run electron/main/ipc/schema.test.ts
```

Expected: FAIL — `Cannot find module './schema'`.

- [ ] **Step 3: Implement `schema.ts`**

```typescript
// electron/main/ipc/schema.ts
import type { IpcMain } from "electron";
import { getDriver } from "./connections";
import { buildSchemaTree } from "../db/schema-builder";
import type { SchemaTreeOptions, SchemaNode } from "../../preload/api";

export function registerSchemaHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    "schema:getTables",
    async (_event, connectionId: string) => {
      const driver = getDriver(connectionId);
      return driver.getTables();
    },
  );

  ipcMain.handle(
    "schema:getColumns",
    async (_event, connectionId: string, tableId: string) => {
      const driver = getDriver(connectionId);
      return driver.getColumns(tableId);
    },
  );

  ipcMain.handle(
    "schema:getForeignKeys",
    async (_event, connectionId: string) => {
      const driver = getDriver(connectionId);
      return driver.getForeignKeys();
    },
  );

  ipcMain.handle(
    "schema:buildSchemaTree",
    async (_event, connectionId: string, options: SchemaTreeOptions): Promise<SchemaNode[]> => {
      const driver = getDriver(connectionId);

      // Fetch all data in parallel
      const [tables, fks] = await Promise.all([
        driver.getTables(),
        driver.getForeignKeys(),
      ]);

      // Fetch columns for each selected table
      const columnsMap = new Map<string, Awaited<ReturnType<typeof driver.getColumns>>>();
      await Promise.all(
        options.selectedTableIds.map(async (tableId) => {
          const cols = await driver.getColumns(tableId);
          columnsMap.set(tableId, cols);
        }),
      );

      // Determine engine from driver type
      const engine = driver.constructor.name === "PgDriver" ? "postgres" : "oracle";

      return buildSchemaTree(tables, columnsMap, fks, options, engine as "postgres" | "oracle");
    },
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run electron/main/ipc/schema.test.ts
```

Expected:
```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

- [ ] **Step 5: Commit**

```bash
git add electron/main/ipc/schema.ts electron/main/ipc/schema.test.ts
git commit -m "feat(electron): schema IPC handler — getTables/getColumns/getForeignKeys/buildSchemaTree"
```

---

## Task 11: Stats + Files IPC handlers

**Files:**
- Create: `electron/main/ipc/stats.ts`
- Create: `electron/main/ipc/stats.test.ts`
- Create: `electron/main/ipc/files.ts`
- Create: `electron/main/ipc/files.test.ts`

- [ ] **Step 1: Write the failing tests for stats**

```typescript
// electron/main/ipc/stats.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetchSampleStats = vi.fn().mockResolvedValue([]);
const mockFetchCardinality = vi.fn().mockResolvedValue({ elementPath: "t", avgCount: 10, minCount: 0, maxCount: 100, sampleSize: 1000 });
const mockGetRowCount = vi.fn().mockResolvedValue(42);

vi.mock("./connections", () => ({
  getDriver: vi.fn().mockReturnValue({
    fetchSampleStats: mockFetchSampleStats,
    fetchCardinality: mockFetchCardinality,
    getRowCount: mockGetRowCount,
  }),
}));

import { registerStatsHandlers } from "./stats";

function makeIpcMain() {
  const handlers: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  return {
    handle: vi.fn((channel: string, fn: (...args: unknown[]) => Promise<unknown>) => {
      handlers[channel] = fn;
    }),
    _invoke: async (channel: string, ...args: unknown[]) => {
      const fn = handlers[channel];
      if (!fn) throw new Error(`No handler for ${channel}`);
      return fn({}, ...args);
    },
  };
}

describe("registerStatsHandlers", () => {
  let ipcMain: ReturnType<typeof makeIpcMain>;

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain = makeIpcMain();
    registerStatsHandlers(ipcMain as any);
  });

  it("registers 3 channels", () => {
    const channels = ipcMain.handle.mock.calls.map((c) => c[0]);
    expect(channels).toContain("stats:fetchSampleStats");
    expect(channels).toContain("stats:fetchCardinality");
    expect(channels).toContain("stats:getRowCount");
  });

  it("fetchSampleStats delegates to driver", async () => {
    mockFetchSampleStats.mockResolvedValueOnce([
      { fieldId: "c", fieldPath: "c", values: [], totalCount: 10, distinctCount: 5, nullCount: 0 },
    ]);
    const result = await ipcMain._invoke("stats:fetchSampleStats", "conn-1", ["public.t.col"]) as unknown[];
    expect(mockFetchSampleStats).toHaveBeenCalledWith(["public.t.col"]);
    expect(result).toHaveLength(1);
  });

  it("fetchCardinality delegates to driver", async () => {
    const result = await ipcMain._invoke("stats:fetchCardinality", "conn-1", "public.t") as Record<string, unknown>;
    expect(mockFetchCardinality).toHaveBeenCalledWith("public.t");
    expect(result.avgCount).toBe(10);
  });

  it("getRowCount delegates to driver", async () => {
    const result = await ipcMain._invoke("stats:getRowCount", "conn-1", "public.t");
    expect(result).toBe(42);
  });

  it("fetchSampleStats returns empty array on timeout (5s)", async () => {
    vi.useFakeTimers();
    mockFetchSampleStats.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 10000)),
    );
    const promise = ipcMain._invoke("stats:fetchSampleStats", "conn-1", ["col"]);
    vi.advanceTimersByTime(5001);
    const result = await promise as unknown[];
    expect(result).toEqual([]);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Write the failing tests for files**

```typescript
// electron/main/ipc/files.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

vi.mock("electron", () => ({
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ["/chosen/dir"] }),
  },
}));

import { registerFilesHandlers } from "./files";

function makeIpcMain() {
  const handlers: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  return {
    handle: vi.fn((channel: string, fn: (...args: unknown[]) => Promise<unknown>) => {
      handlers[channel] = fn;
    }),
    _invoke: async (channel: string, ...args: unknown[]) => {
      const fn = handlers[channel];
      if (!fn) throw new Error(`No handler for ${channel}`);
      return fn({}, ...args);
    },
  };
}

describe("registerFilesHandlers", () => {
  let ipcMain: ReturnType<typeof makeIpcMain>;
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain = makeIpcMain();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xfeb-files-"));
    registerFilesHandlers(ipcMain as any);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("registers 2 channels", () => {
    const channels = ipcMain.handle.mock.calls.map((c) => c[0]);
    expect(channels).toContain("files:chooseOutputDir");
    expect(channels).toContain("files:savePackage");
  });

  it("chooseOutputDir returns selected path", async () => {
    const result = await ipcMain._invoke("files:chooseOutputDir");
    expect(result).toBe("/chosen/dir");
  });

  it("chooseOutputDir returns null when dialog is cancelled", async () => {
    const { dialog } = await import("electron");
    (dialog.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ canceled: true, filePaths: [] });
    const result = await ipcMain._invoke("files:chooseOutputDir");
    expect(result).toBeNull();
  });

  it("savePackage writes files to disk and returns saved paths", async () => {
    const files = {
      "filter.xml": "<filter/>",
      "transform.xsl": "<xsl:stylesheet/>",
    };
    const result = await ipcMain._invoke("files:savePackage", files, tmpDir) as { savedPaths: string[]; outputDir: string };
    expect(result.outputDir).toBe(tmpDir);
    expect(result.savedPaths).toHaveLength(2);
    for (const savedPath of result.savedPaths) {
      expect(fs.existsSync(savedPath)).toBe(true);
    }
    const content = fs.readFileSync(path.join(tmpDir, "filter.xml"), "utf8");
    expect(content).toBe("<filter/>");
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run electron/main/ipc/stats.test.ts electron/main/ipc/files.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `stats.ts`**

```typescript
// electron/main/ipc/stats.ts
import type { IpcMain } from "electron";
import { getDriver } from "./connections";
import type { FieldSampleData, CardinalityStats } from "../../preload/api";

const STATS_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

export function registerStatsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    "stats:fetchSampleStats",
    async (_event, connectionId: string, columns: string[]): Promise<FieldSampleData[]> => {
      const driver = getDriver(connectionId);
      return withTimeout(driver.fetchSampleStats(columns), STATS_TIMEOUT_MS, []);
    },
  );

  ipcMain.handle(
    "stats:fetchCardinality",
    async (_event, connectionId: string, tableId: string): Promise<CardinalityStats> => {
      const driver = getDriver(connectionId);
      const fallback: CardinalityStats = {
        elementPath: tableId,
        avgCount: 0,
        minCount: 0,
        maxCount: 0,
        sampleSize: 0,
      };
      return withTimeout(driver.fetchCardinality(tableId), STATS_TIMEOUT_MS, fallback);
    },
  );

  ipcMain.handle(
    "stats:getRowCount",
    async (_event, connectionId: string, tableId: string): Promise<number> => {
      const driver = getDriver(connectionId);
      return withTimeout(driver.getRowCount(tableId), STATS_TIMEOUT_MS, 0);
    },
  );
}
```

- [ ] **Step 5: Implement `files.ts`**

```typescript
// electron/main/ipc/files.ts
import type { IpcMain } from "electron";
import { dialog } from "electron";
import * as fs from "fs";
import * as path from "path";
import type { PackageFiles, SaveResult } from "../../preload/api";

export function registerFilesHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("files:chooseOutputDir", async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "Choose output folder",
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    "files:savePackage",
    async (_event, files: PackageFiles, outputDir: string): Promise<SaveResult> => {
      await fs.promises.mkdir(outputDir, { recursive: true });
      const savedPaths: string[] = [];
      for (const [filename, content] of Object.entries(files)) {
        const filePath = path.join(outputDir, filename);
        await fs.promises.writeFile(filePath, content, "utf8");
        savedPaths.push(filePath);
      }
      return { savedPaths, outputDir };
    },
  );
}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
npx vitest run electron/main/ipc/stats.test.ts electron/main/ipc/files.test.ts
```

Expected:
```
 Test Files  2 passed (2)
      Tests  8 passed (8)
```

- [ ] **Step 7: Commit**

```bash
git add electron/main/ipc/stats.ts electron/main/ipc/stats.test.ts \
        electron/main/ipc/files.ts electron/main/ipc/files.test.ts
git commit -m "feat(electron): stats and files IPC handlers — timeout fallback + native save dialog"
```

---

## Task 12: Wire all IPC handlers in `electron/main/index.ts`

**Files:**
- Modify: `electron/main/index.ts`

- [ ] **Step 1: Update `index.ts` to call all register functions**

```typescript
// electron/main/index.ts
import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { registerConnectionHandlers } from "./ipc/connections";
import { registerSchemaHandlers } from "./ipc/schema";
import { registerStatsHandlers } from "./ipc/stats";
import { registerFilesHandlers } from "./ipc/files";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "XML Filter & Export Builder",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.on("ready-to-show", () => {
    win.show();
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  // Register all IPC handlers before creating the window
  registerConnectionHandlers(ipcMain);
  registerSchemaHandlers(ipcMain);
  registerStatsHandlers(ipcMain);
  registerFilesHandlers(ipcMain);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
```

- [ ] **Step 2: Type-check the electron build**

```bash
npx tsc --project tsconfig.electron.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run the full test suite to verify no regressions**

```bash
npx vitest run
```

Expected (last lines):
```
 Test Files  2 failed | X passed
      Tests  4 failed | 568 passed
```

The 4 golden failures and the count of passing tests must be unchanged from the Task 1 baseline. Any new electron tests we added are counted in the passing total (now higher than 568 for src/ alone, but the 568 src/ tests all still pass).

- [ ] **Step 4: Verify electron build compiles**

```bash
npm run build:electron
```

Expected: build completes without errors. `out/` directory is populated with `main/`, `preload/`, and `renderer/` subdirectories.

- [ ] **Step 5: Commit**

```bash
git add electron/main/index.ts
git commit -m "feat(electron): wire all IPC handlers in main process entry point"
```

---

## Task 13: DatabaseProvider (`src/engine/provider/database-provider.ts`)

**Files:**
- Create: `src/engine/provider/database-provider.ts`
- Create: `src/engine/provider/database-provider.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/engine/provider/database-provider.test.ts
// Uses default jsdom environment (no pragma needed — vitest.config global default)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DatabaseProvider } from "./database-provider";

const mockFetchSampleStats = vi.fn();
const mockFetchCardinality = vi.fn();
const mockGetRowCount = vi.fn();

function setupElectronAPI() {
  Object.defineProperty(window, "electronAPI", {
    value: {
      stats: {
        fetchSampleStats: mockFetchSampleStats,
        fetchCardinality: mockFetchCardinality,
        getRowCount: mockGetRowCount,
      },
    },
    configurable: true,
    writable: true,
  });
}

function removeElectronAPI() {
  Object.defineProperty(window, "electronAPI", {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

describe("DatabaseProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupElectronAPI();
  });

  afterEach(() => {
    removeElectronAPI();
  });

  describe("isAvailable()", () => {
    it("returns true when window.electronAPI is defined", () => {
      const provider = new DatabaseProvider("conn-1", new Map());
      expect(provider.isAvailable()).toBe(true);
    });

    it("returns false when window.electronAPI is absent", () => {
      removeElectronAPI();
      const provider = new DatabaseProvider("conn-1", new Map());
      expect(provider.isAvailable()).toBe(false);
    });
  });

  it("source is 'api'", () => {
    const provider = new DatabaseProvider("conn-1", new Map());
    expect(provider.source).toBe("api");
  });

  describe("fetchSampleData()", () => {
    it("groups field paths by table and calls fetchSampleStats per table", async () => {
      const tableMapping = new Map([
        ["programme.", "public.programme"],
        ["genre.", "public.genre"],
      ]);

      mockFetchSampleStats.mockResolvedValue([
        {
          fieldId: "public.programme.title",
          fieldPath: "public.programme.title",
          values: [{ value: "BBC News", count: 100 }],
          totalCount: 500,
          distinctCount: 200,
          nullCount: 0,
        },
      ]);

      const provider = new DatabaseProvider("conn-1", tableMapping);
      const result = await provider.fetchSampleData(["programme.title"]);

      expect(mockFetchSampleStats).toHaveBeenCalledWith("conn-1", expect.arrayContaining(["public.programme.title"]));
      expect(result.source).toBe("api");
      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].fieldPath).toBe("public.programme.title");
      expect(result.fetchedAt).toBeGreaterThan(0);
    });

    it("returns empty fields when electronAPI is unavailable", async () => {
      removeElectronAPI();
      const provider = new DatabaseProvider("conn-1", new Map());
      const result = await provider.fetchSampleData(["some.field"]);
      expect(result.fields).toHaveLength(0);
      expect(result.cardinality).toHaveLength(0);
    });

    it("returns empty cardinality array (fetchCardinality is separate)", async () => {
      mockFetchSampleStats.mockResolvedValue([]);
      const provider = new DatabaseProvider("conn-1", new Map([["t.", "public.t"]]));
      const result = await provider.fetchSampleData(["t.col"]);
      expect(result.cardinality).toEqual([]);
    });
  });

  describe("fetchCardinality()", () => {
    it("calls fetchCardinality for each element path's table", async () => {
      const tableMapping = new Map([["programme.", "public.programme"]]);
      mockFetchCardinality.mockResolvedValue({
        elementPath: "public.programme",
        avgCount: 100,
        minCount: 0,
        maxCount: 500,
        sampleSize: 1000,
      });

      const provider = new DatabaseProvider("conn-1", tableMapping);
      const result = await provider.fetchCardinality(["programme"]);

      expect(mockFetchCardinality).toHaveBeenCalledWith("conn-1", "public.programme");
      expect(result).toHaveLength(1);
      expect(result[0].elementPath).toBe("public.programme");
    });

    it("returns empty array when electronAPI is unavailable", async () => {
      removeElectronAPI();
      const provider = new DatabaseProvider("conn-1", new Map());
      const result = await provider.fetchCardinality(["programme"]);
      expect(result).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/engine/provider/database-provider.test.ts
```

Expected: FAIL — `Cannot find module './database-provider'`.

- [ ] **Step 3: Implement `database-provider.ts`**

```typescript
// src/engine/provider/database-provider.ts
//
// Implements DataProvider using window.electronAPI.
// Only instantiate this in an Electron context — isAvailable() returns false
// in the web build where window.electronAPI is absent.
import type {
  DataProvider,
  SampleDataResponse,
  CardinalityStats,
} from "../data-provider/types";

/**
 * Maps a field path prefix (e.g. "programme.") to a DB table ID
 * (e.g. "public.programme"). Used to route field paths to the correct table.
 */
type TableMapping = Map<string, string>; // fieldPathPrefix → tableId

export class DatabaseProvider implements DataProvider {
  readonly source = "api" as const;

  constructor(
    private readonly connectionId: string,
    private readonly tableMapping: TableMapping,
  ) {}

  isAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof (window as Window & { electronAPI?: unknown }).electronAPI !== "undefined" &&
      (window as Window & { electronAPI?: unknown }).electronAPI != null
    );
  }

  async fetchSampleData(
    fieldPaths: readonly string[],
    _limit?: number,
  ): Promise<SampleDataResponse> {
    if (!this.isAvailable()) {
      return { fields: [], cardinality: [], fetchedAt: Date.now(), source: "api" };
    }

    const api = (window as Window & { electronAPI: { stats: { fetchSampleStats: (connectionId: string, columns: string[]) => Promise<import("../data-provider/types").FieldSampleData[]> } } }).electronAPI;

    // Map each field path to its DB column path (schema.table.column)
    const dbColumns = fieldPaths.map((fp) => this.resolveDbColumn(fp)).filter((c): c is string => c !== null);

    if (dbColumns.length === 0) {
      return { fields: [], cardinality: [], fetchedAt: Date.now(), source: "api" };
    }

    const fields = await api.stats.fetchSampleStats(this.connectionId, dbColumns);

    return {
      fields,
      cardinality: [],
      fetchedAt: Date.now(),
      source: "api",
    };
  }

  async fetchCardinality(
    elementPaths: readonly string[],
  ): Promise<readonly CardinalityStats[]> {
    if (!this.isAvailable()) return [];

    const api = (window as Window & { electronAPI: { stats: { fetchCardinality: (connectionId: string, tableId: string) => Promise<CardinalityStats> } } }).electronAPI;

    const results: CardinalityStats[] = [];
    for (const elementPath of elementPaths) {
      const tableId = this.resolveTableId(elementPath);
      if (!tableId) continue;
      const stat = await api.stats.fetchCardinality(this.connectionId, tableId);
      results.push(stat);
    }
    return results;
  }

  /**
   * Resolves a renderer-side field path like "programme.title" to a DB column
   * path like "public.programme.title" using the tableMapping.
   */
  private resolveDbColumn(fieldPath: string): string | null {
    for (const [prefix, tableId] of this.tableMapping) {
      if (fieldPath.startsWith(prefix)) {
        const columnName = fieldPath.slice(prefix.length);
        return `${tableId}.${columnName}`;
      }
    }
    // Fallback: try treating the path as already fully qualified
    return fieldPath.includes(".") ? fieldPath : null;
  }

  /**
   * Resolves a renderer-side element path like "programme" to a DB table ID
   * like "public.programme" using the tableMapping.
   */
  private resolveTableId(elementPath: string): string | null {
    const prefix = `${elementPath}.`;
    return this.tableMapping.get(prefix) ?? null;
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/engine/provider/database-provider.test.ts
```

Expected:
```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

- [ ] **Step 5: Run the full suite to confirm no regressions**

```bash
npx vitest run
```

Expected (last lines):
```
 Test Files  2 failed | X passed
      Tests  4 failed | 568 passed
```

The 568 pre-existing src/ tests all still pass. The 4 golden failures are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/engine/provider/database-provider.ts \
        src/engine/provider/database-provider.test.ts
git commit -m "feat(src): DatabaseProvider — implements DataProvider via window.electronAPI.stats"
```
