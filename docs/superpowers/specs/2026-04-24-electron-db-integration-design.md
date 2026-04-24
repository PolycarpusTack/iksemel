# Electron + Database Integration — Design Spec

**Date:** 2026-04-24  
**Status:** Approved  
**Author:** Yannick Verrydt

---

## Overview

Convert XFEB from a pure web app into an Electron desktop app that can connect directly to PostgreSQL and Oracle databases, introspect their schema, and use real row statistics to power accurate payload size estimation. The existing web build is preserved untouched for embedded/browser use. All 13 UX features remain fully functional.

---

## Goals

- Connect to PostgreSQL and Oracle databases from the desktop app
- Introspect DB schema (tables, views, columns, FK relationships) as a schema source equivalent to loading an XSD
- Let users choose per-FK whether to nest or flatten relationships
- Feed real DB statistics (row counts, value distributions, cardinalities) into the existing size estimator
- Save named connection profiles with passwords in the OS keychain
- Favourites section for frequently used connections
- Distribute as a signed installer for Windows (primary) and macOS (secondary)
- Auto-update via GitHub Releases

## Non-Goals

- The PostMessage bridge / embedded mode is not ported to Electron (kept in web build only)
- SQL Server, MySQL, and other engines are out of scope
- No query builder or data browser — schema introspection only
- Oracle Instant Client is not bundled (Oracle license prohibits redistribution)

---

## Architecture

### Process Model

```
┌─────────────────────────────────────────────────┐
│  Main Process (Node.js)                          │
│  - DB Connection Manager                         │
│  - pg (PostgreSQL driver — pure JS)              │
│  - oracledb (Oracle — requires Instant Client)   │
│  - OS Keychain via Electron safeStorage          │
│  - File system (export package save)             │
│  - Auto-updater (electron-updater)               │
│  - IPC handlers                                  │
└──────────────────┬──────────────────────────────┘
                   │ IPC (secure)
┌──────────────────┴──────────────────────────────┐
│  Preload Script                                  │
│  - Context bridge exposes window.electronAPI     │
│  - No Node.js globals leak into renderer         │
└──────────────────┬──────────────────────────────┘
                   │ calls
┌──────────────────┴──────────────────────────────┐
│  Renderer Process (Chromium)                     │
│  - Existing React app — unchanged                │
│  - New: Database tab in SchemaUpload             │
│  - New: DatabaseProvider (implements DataProvider)│
│  - New: FK nesting choice wizard                 │
│  - New: Connection Manager (profiles + favs)     │
└─────────────────────────────────────────────────┘
```

### Build Pipeline

- **electron-vite** — builds main, preload, and renderer as separate targets; HMR works in dev
- **electron-builder** — packages installers, handles code signing and auto-update feed
- The existing `vite.config.ts` web build continues to work alongside it
- `oracledb` (native module) rebuilt for Electron's Node version via `@electron/rebuild` in CI; `safeStorage` is Electron built-in — no rebuild needed

### Web Build Preservation

The Vite web build target is preserved. The PostMessage bridge, embedded mode, and all existing functionality continue to work in the browser. Electron is an additive distribution target sharing the same React source.

---

## IPC API (`window.electronAPI`)

All communication between renderer and main process goes through the context bridge. The API is fully typed in a shared `src/electron/preload/api.ts` file.

### connections

```typescript
testConnection(profile: ConnectionProfileInput): Promise<TestResult>
connect(profileId: string): Promise<ConnectionResult>      // opens pooled session
disconnect(connectionId: string): Promise<void>
listProfiles(): Promise<ConnectionProfile[]>
saveProfile(profile: ConnectionProfileInput): Promise<ConnectionProfile>
deleteProfile(profileId: string): Promise<void>
setFavourite(profileId: string, favourite: boolean): Promise<void>
```

### schema

```typescript
getTables(connectionId: string): Promise<TableInfo[]>
getColumns(connectionId: string, tableId: string): Promise<ColumnInfo[]>
getForeignKeys(connectionId: string): Promise<ForeignKeyRelation[]>
buildSchemaTree(connectionId: string, options: SchemaTreeOptions): Promise<SchemaNode[]>
```

`SchemaTreeOptions` carries: selected table IDs, FK nesting decisions (`Record<fkId, "nest" | "flat">`), include-views flag, and max self-ref depth.

### stats

```typescript
fetchSampleStats(connectionId: string, columns: string[]): Promise<FieldSampleData[]>
fetchCardinality(connectionId: string, tableId: string): Promise<CardinalityStats>
getRowCount(connectionId: string, tableId: string): Promise<number>
```

These map directly onto the existing `DataProvider` interface. A new `DatabaseProvider` class implements that interface using these calls. `useDataEstimate` and the estimation engine need no changes. `DatabaseProvider` is only instantiated in the Electron context — it guards against `window.electronAPI` being absent and is never registered as the active provider in the web build.

### files

```typescript
chooseOutputDir(): Promise<string | null>    // native OS folder picker
savePackage(files: PackageFiles, outputDir: string): Promise<SaveResult>
```

In the web build the existing JSZip download continues unchanged. In Electron, `savePackage` writes files directly to disk.

### updates

```typescript
onUpdateAvailable(cb: (version: string) => void): () => void   // returns unsubscribe
installUpdate(): Promise<void>
```

Update available is shown as a dismissable toast only — never blocking.

---

## Database Layer

### PostgreSQL

**Driver:** `pg` (pure JS, no native dependencies)

**Connection inputs:**
- Host, port (default 5432), database name
- Username + password (password in OS keychain)
- Schema filter (default: `public`; multiple schemas selectable)
- SSL mode: `disable` / `require` / `verify-full`
- Optional custom CA certificate path (for self-signed certs — common in enterprise)

**Connection pool:** `pg.Pool`, max 3 connections, idle timeout 30s.

**Edge cases:**
- Self-signed SSL certificates: `rejectUnauthorized: false` toggle available
- Multiple schemas per database: user picks which to introspect

### Oracle

**Driver:** `oracledb` (native bindings, requires Oracle Instant Client)

**Connection inputs:**
- Easy Connect string: `host:port/service_name`
- TNS alias (reads from `tnsnames.ora` at standard Oracle path)
- Username + password (password in OS keychain)
- Wallet directory path (for TLS/mTLS connections)
- Schema/owner filter

**Instant Client detection:**
- Checked on first Oracle connection attempt (not on app startup)
- If missing: informative dialog with direct Oracle download link and path setup instructions per OS
- Most deployment machines already have Instant Client installed; this dialog is the rare-case fallback
- User can set a custom Instant Client path in settings; saved to `~/.xfeb/settings.json`

**Edge cases handled:**

| Issue | Handling |
|-------|----------|
| Identifiers stored UPPERCASE | Normalised to lowercase in SchemaNode names |
| `DATE` includes time component | Mapped to `xs:dateTime`, not `xs:date` |
| `NUMBER` with no precision | Mapped to `xs:decimal` |
| CLOB / BLOB columns | Excluded from schema tree entirely |
| System schemas (SYS, SYSTEM, MDSYS, etc.) | Filtered out automatically |
| Synonyms | Resolved to base table for introspection |
| TNS resolution failure | Clear error with path hint; suggests Easy Connect as alternative |
| Pluggable Databases (PDB) | Treated as a normal service name |

### DB Type → XSD Type Mapping (both engines)

| DB Types | XSD Type |
|----------|----------|
| VARCHAR, VARCHAR2, CHAR, TEXT, NVARCHAR | `xs:string` |
| INTEGER, INT, SMALLINT, BIGINT | `xs:integer` |
| NUMERIC, DECIMAL, NUMBER (with precision) | `xs:decimal` |
| NUMBER (no precision), FLOAT, DOUBLE, REAL | `xs:decimal` |
| BOOLEAN | `xs:boolean` |
| DATE (PG) | `xs:date` |
| DATE (Oracle) | `xs:dateTime` |
| TIMESTAMP, DATETIME | `xs:dateTime` |
| CLOB, BLOB, BYTEA, TEXT (large) | excluded |

`NULL` columns → `minOccurs="0"`, `NOT NULL` → `minOccurs="1"`.

### Schema Mapping Edge Cases

**Circular FK relationships (A → B, B → A):**
Detected via DFS cycle detection during tree construction. The edge that closes the cycle is forced to `flat`. A warning is shown in the FK configuration step — the toggle is disabled with a "Circular — auto-flat" badge.

**Self-referential FKs (e.g. `CATEGORY.parent_id → CATEGORY`):**
Shown in the FK step as nestable with a depth selector (default 3, max 5). The tree builder generates up to N levels of recursive child nodes.

**Composite FK keys (FK spanning multiple columns):**
Automatically flattened — shown greyed out in the FK step with an explanation. Nesting composite-key FKs produces ambiguous XML element identity.

**Very wide tables (500+ columns):**
Column list loaded lazily per-table, not upfront. Progress indicator shown during introspection. Stats queries use `TABLESAMPLE` (PG) / `SAMPLE` clause (Oracle) for fast approximation on large tables.

**Reserved XML element names (e.g. column named `xml`, `xsl`):**
Prefixed with the table name: `programme_xml`, `programme_xsl`.

**Views:**
Included in the table list with a "VIEW" badge. No FK introspection for views (no FK metadata in DB). Column list only. Stats queries work normally against views.

---

## Credential Storage

Credentials are split across two stores:

**Profile file** (`~/.xfeb/profiles.json`):
Stores host, port, database, username, engine, label, `isFavourite`, `lastUsed`. Everything except passwords.

**Electron `safeStorage`** (built-in, no native module required):
Passwords are encrypted with `safeStorage.encryptString` before being written to `profiles.json` alongside their profile entry. `safeStorage` uses Windows DPAPI on Windows and Keychain Access on macOS under the hood. Never stored in plaintext.

---

## Schema Mapping Flow (UI)

A two-step wizard replaces the XSD upload for DB-sourced schemas. Entry point: "Database" tab in the existing `SchemaUpload` panel.

**Step 1 — Table selection:**
- Lists all tables and views from the selected schema(s) with column count and row count
- Search/filter field
- Tables/Views filter toggle
- Checkboxes to include/exclude; most tables pre-selected, obvious utility tables (audit logs, config tables) pre-deselected based on name heuristics

**Step 2 — FK configuration:**
- Lists all FK relationships among selected tables
- Each FK has a NEST / FLAT toggle with a plain-English description
- Circular FKs: auto-flat, toggle disabled, warning badge
- Self-referential FKs: nestable with depth selector
- Composite FKs: auto-flat, greyed out

**Build → dispatch:**
`buildSchemaTree` is called with the user's choices. The resulting `SchemaNode[]` is dispatched as `LOAD_SCHEMA` — identical to loading an XSD. The full app (tree, filters, design, export, history, tour) works unchanged.

The connection profile + FK choices are persisted: table selection and FK nesting decisions are saved as a `schemaConfig` field on the profile entry in `~/.xfeb/profiles.json`. "Refresh schema" re-runs `buildSchemaTree` with these saved choices — no wizard re-entry required.

---

## Connection Manager UI

**SchemaUpload panel gains a third tab: "Database"** (XSD File and Paste XSD tabs unchanged).

The Database tab contains:
- **Favourites** section — starred profiles, shown first, Connect button per row
- **Recent** section — last 5 used, with timestamp, Connect button per row
- **+ New Connection** button — opens the connection dialog

**Connection dialog** fields adapt to engine:
- PostgreSQL: host, port, database, schema, username, password, SSL mode, CA cert path, add-to-favourites toggle
- Oracle: Easy Connect / TNS alias selector, host/port/service or TNS name, username, password, wallet path, schema filter, add-to-favourites toggle

Both: Label field, Test Connection button, Save & Connect button.

**Header strip** (when schema loaded from DB):
Shows active connection badge (engine icon + profile label + selected table names) and a **Refresh** button. Refresh re-runs `buildSchemaTree` with saved choices — no wizard re-entry.

---

## Error Handling

| Scenario | User-facing response |
|----------|---------------------|
| Oracle Instant Client missing | Informative dialog on first Oracle connect attempt; download link + path instructions; app remains usable for XSD and PG |
| Connection timeout (10s) | Error distinguishes: host unreachable / auth failed / database not found — each with a specific fix hint |
| DB permissions insufficient | Lists which tables failed with the exact privilege required; partial introspection proceeds for accessible tables |
| Oracle TNS alias not found | Shows expected tnsnames.ora path; suggests switching to Easy Connect |
| Stats query timeout (5s) | Silent fallback to static estimation; MetricsBar shows `source: "static"` as normal |
| Connection lost mid-session | Toast: "Lost connection to [profile] — Reconnect"; schema and selection state preserved; reconnect re-opens pool only |
| Large schema (500+ tables) | Lazy loading with progress bar; stats use TABLESAMPLE/SAMPLE for fast approximation |
| Auto-update check fails | Silent — no crash, no intrusive dialog |
| Update available | Dismissable toast only; never blocking |

---

## Packaging & Distribution

### Windows (primary target)
- NSIS installer (`.exe`) + portable ZIP option
- Code-signed with EV certificate (prevents SmartScreen warnings)
- Auto-update feed via GitHub Releases using `electron-updater`
- `oracledb` rebuilt for Electron's Node via `@electron/rebuild` in CI

### macOS (secondary target)
- `.dmg` (drag-to-Applications)
- Universal binary (Intel + Apple Silicon)
- Notarized via Apple Notarization Service (required for Gatekeeper)
- macOS build requires a macOS runner — GitHub Actions matrix job
- Auto-update via GitHub Releases

### Oracle Instant Client
- Not bundled (Oracle license prohibits redistribution)
- Detected on first Oracle connection attempt
- App prompts with direct Oracle download link and OS-specific path setup instructions
- User can override the Instant Client path in settings

---

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Existing web tests | Vitest | All 568 tests unchanged — renderer has no Electron dependency |
| Schema mapping unit tests | Vitest | DB type mapping, FK cycle detection, self-ref depth, name sanitisation, composite FK logic — pure functions, no DB needed |
| IPC handler unit tests | Vitest (Node) | All handlers tested in isolation; DB driver mocked; covers all error paths |
| PG integration tests | Vitest + Docker Postgres | connect, getTables, getColumns, getForeignKeys, buildSchemaTree, fetchSampleStats — real DB, fast container |
| Oracle integration tests | Vitest (local only) | Skipped in CI; run locally against real Oracle instance; CI uses mocked responses |
| E2E smoke tests | Playwright (`_electron` API) | App launches, XSD upload works, Database tab visible, connection dialog opens, schema loads |

---

## File Structure (new files only)

All Electron-specific files live inside `Iksemel/` alongside the existing `src/`.

```
Iksemel/
  electron/
    main/
      index.ts                  Electron main entry
      ipc/
        connections.ts          Connection profile CRUD + safeStorage
        schema.ts               DB introspection IPC handlers
        stats.ts                Sample stats + cardinality IPC handlers
        files.ts                Native save dialog + package write
        updates.ts              electron-updater wiring
      db/
        pg-driver.ts            PostgreSQL introspection + stats
        oracle-driver.ts        Oracle introspection + stats
        type-mapper.ts          DB column type → xs:* mapping
        schema-builder.ts       Tables + FK choices → SchemaNode[]
        cycle-detector.ts       DFS circular FK detection
      profiles.ts               Profile file persistence (~/.xfeb/profiles.json)
    preload/
      index.ts                  Context bridge — exposes window.electronAPI
      api.ts                    Shared TypeScript types for the IPC surface

  src/
    engine/
      provider/
        database-provider.ts    Implements DataProvider using window.electronAPI (Electron only)
    components/
      shared/
        SchemaUpload.tsx        Reorganised into 3 tabs: XSD File / Paste XSD / Database
        ConnectionManager/
          ConnectionList.tsx    Favourites + recent list
          ConnectionDialog.tsx  New/edit connection form
      db-wizard/
        TableSelector.tsx       Step 1 — table selection
        FkConfigurator.tsx      Step 2 — FK nest/flat choices
```

---

## Open Questions

None — all design decisions resolved during brainstorming.
