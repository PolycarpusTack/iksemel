# Mapping Studio — Solution Design

**XFEB Mapping Studio — Solution Design Document**
**Reference:** MGX-XFEB-MS-SD-2026-001
**Parent:** MGX-XFEB-EVO-2026-001 (XFEB Evolution Plan)
**Date:** 16 February 2026

---

## 1. Executive Summary

The Mapping Studio is a visual tool that lets users model the relationship between source data structures (database tables, XML elements, API responses) and report output structures. It bridges the gap between "I have data" and "I have a report-ready schema" — the step that currently requires technical knowledge of XSD authoring or database query design.

**Core value proposition:** Users model their data relationships once, then reuse that mapping across multiple reports.

**Prerequisite:** XFEB Evolution Phase 4 (Database Ingestion) must be complete. The Mapping Studio operates on database schema trees produced by `DatabaseSchemaProvider`.

---

## 2. Problem Statement

### Current Pain Points

1. **Schema literacy required:** Users must understand XSD or database schemas to select the right fields and relationships.
2. **Implicit joins:** When data spans multiple tables, users must mentally construct the JOIN path. The current tree view shows FK relationships but doesn't explain what they mean in business terms.
3. **Business-to-technical gap:** Users think in terms of "I need the channel name for each programme" but must translate this to a specific FK traversal path.
4. **Repeated work:** Each new report requires re-discovering the same data relationships.

### Who This Is For

| Persona | Current Pain | Mapping Studio Value |
|---------|-------------|---------------------|
| **Scheduler** | Can't navigate complex schemas | Models once with help, reuses forever |
| **Operations Manager** | Requests reports from IT | Self-service via saved mappings |
| **Consultant** | Spends hours explaining schema to clients | Creates reusable mappings per client |
| **Technical Integrator** | Builds custom XSD/SQL for each report | Defines mapping once, all reports inherit |

---

## 3. Architecture

### 3.1 System Context

```
┌──────────────────────────────────────────────────────────┐
│                     XFEB Application                      │
│                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐  │
│  │ Schema       │    │ Mapping      │    │ Report     │  │
│  │ Providers    │───>│ Studio       │───>│ Builder    │  │
│  │              │    │              │    │ (existing) │  │
│  │ - XSD        │    │ - Visual     │    │            │  │
│  │ - XML Sample │    │   modeler    │    │ - Select   │  │
│  │ - Database   │    │ - Mapping    │    │ - Filter   │  │
│  │ - API        │    │   engine     │    │ - Generate │  │
│  └──────────────┘    │ - Persistence│    │ - Package  │  │
│                      └──────────────┘    └────────────┘  │
│                             │                             │
│                      ┌──────┴──────┐                      │
│                      │  Mapping    │                      │
│                      │  Store      │                      │
│                      │  (versioned)│                      │
│                      └─────────────┘                      │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Core Concepts

#### Mapping Spec

A **Mapping Spec** is the persistent artifact produced by the Mapping Studio. It defines:

```typescript
interface MappingSpec {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Version (incremented on save) */
  version: number;

  /** Source description */
  source: {
    type: 'database' | 'xml' | 'api';
    identifier: string;    // connection ID, file hash, API endpoint
    schemaVersion: string; // hash of source schema at mapping time
  };

  /** Root entity — the primary business object */
  rootEntity: EntityMapping;

  /** All entity mappings (flat list; tree structure via parentId) */
  entities: EntityMapping[];

  /** User-defined labels for business concepts */
  glossary: GlossaryEntry[];

  /** Metadata */
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  description: string;
  tags: string[];
}
```

#### Entity Mapping

An **Entity Mapping** maps a source structure (table, XML element) to a business concept:

```typescript
interface EntityMapping {
  /** Unique ID within this mapping spec */
  id: string;

  /** Parent entity ID (null for root) */
  parentId: string | null;

  /** Business name (user-editable) */
  businessName: string;

  /** Description of what this entity represents */
  description: string;

  /** Source reference (table name, element XPath) */
  sourceRef: string;

  /** How this entity relates to its parent */
  relationship: {
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    /** For database: FK column(s); for XML: XPath relative to parent */
    joinPath: string;
    /** For many-to-many: junction table/element */
    junctionRef?: string;
  } | null;  // null for root

  /** Field mappings within this entity */
  fields: FieldMapping[];
}
```

#### Field Mapping

A **Field Mapping** maps a source field to a report-ready column:

```typescript
interface FieldMapping {
  /** Unique ID within this entity */
  id: string;

  /** Business label (user-editable, defaults to source column/element name) */
  label: string;

  /** Source column name or XPath */
  sourceRef: string;

  /** Canonical type (mapped from source type) */
  canonicalType: string;  // SchemaNode-compatible type name

  /** Display format hint */
  displayFormat?: string;  // e.g., "DD/MM/YYYY", "#,##0.00"

  /** Whether this field is commonly needed (based on heuristics or user marking) */
  recommended: boolean;

  /** User-added notes */
  notes?: string;
}
```

### 3.3 Data Flow

```
Source Schema (SchemaNode[])
        │
        ▼
┌─────────────────────┐
│  Root Detection      │  Identify candidate root entities
│  (automatic)         │  (tables with most FKs pointing to them,
│                      │   elements with most children)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Relationship        │  Detect joins from FKs/nesting
│  Analysis            │  Classify: 1:1, 1:N, M:N
│  (automatic)         │  Suggest join labels
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Mapping Studio UI   │  User reviews, renames, adjusts
│  (interactive)       │  relationships, marks recommended
│                      │  fields, adds descriptions
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  MappingSpec         │  Persisted artifact
│  (output)            │  Versioned, shareable
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  SchemaNode Tree     │  Convert mapping to SchemaNode tree
│  (derived)           │  with business labels as documentation
│                      │  and relationship info as structure
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  XFEB Report Builder │  Standard selection, filter,
│  (existing)          │  generation pipeline
└─────────────────────┘
```

### 3.4 Module Architecture

```
src/
  engine/
    mapping/                      # Pure TypeScript — no React
      types.ts                    # MappingSpec, EntityMapping, FieldMapping
      root-detector.ts            # Identify root entity candidates
      relationship-analyzer.ts    # FK/nesting → relationship classification
      label-generator.ts          # Smart business labels from column names
      mapping-to-schema.ts        # MappingSpec → SchemaNode[] conversion
      mapping-validator.ts        # Validate mapping consistency
      mapping-diff.ts             # Diff two mapping versions
      mapping-serializer.ts       # JSON serialization with versioning
      mapping-store.ts            # Storage abstraction (memory, API)
      index.ts                    # Barrel exports

  components/
    mapping-studio/               # React UI
      MappingStudio.tsx           # Main container
      MappingStudio.module.css
      EntityPanel.tsx             # Entity list/tree with drag-drop
      EntityPanel.module.css
      EntityCard.tsx              # Single entity with fields
      EntityCard.module.css
      FieldList.tsx               # Field list within entity
      FieldList.module.css
      RelationshipEditor.tsx      # Edit join type and path
      RelationshipEditor.module.css
      MappingCanvas.tsx           # Visual relationship diagram
      MappingCanvas.module.css
      MappingToolbar.tsx          # Actions: save, validate, export
      MappingToolbar.module.css
      GlossaryPanel.tsx           # Business term definitions
      GlossaryPanel.module.css
      MappingPreview.tsx          # Preview of resulting schema tree
      MappingPreview.module.css
      index.ts
```

### 3.5 Integration Points

#### With SchemaProvider Registry

The Mapping Studio consumes `SchemaNode[]` from any registered provider. It doesn't know or care whether the source is a database, XSD, or XML sample.

#### With Report Builder

The Mapping Studio outputs a `SchemaNode[]` tree (via `mappingToSchema()`) that feeds directly into the existing selection → filter → generation pipeline. The conversion:
- `EntityMapping` → complex `SchemaNode` (with children)
- `FieldMapping` → leaf `SchemaNode`
- `relationship.type` → `maxOccurs` ("one-to-many" → "unbounded")
- `businessName` → `SchemaNode.documentation`
- `canonicalType` → `SchemaNode.typeName`

#### With Template System

Mapping Specs can be referenced by templates. A template can specify:
```json
{
  "mappingRef": "mapping-123",
  "fieldPatterns": ["Programme/Title", "Programme/Channel/Name"]
}
```

When applied, the template loads the mapping and selects the specified fields.

#### With Wizard

The wizard Step 3 ("Choose Business Object") can offer entities from a mapping instead of raw schema nodes when a mapping is available.

---

## 4. Smart Defaults & Heuristics

### 4.1 Root Entity Detection

**Algorithm:**

1. Score each top-level entity (table/element):
   - `+3` for each FK relationship pointing TO this entity (it's a central entity)
   - `+2` for each FK relationship pointing FROM this entity (it has detail entities)
   - `+1` for each column/field
   - `-1` for names containing "junction", "link", "mapping", "xref" (likely junction tables)
   - `+2` for names matching common root patterns: "programme", "show", "event", "schedule", "broadcast", "episode"

2. Return top 3 candidates sorted by score.

### 4.2 Join Suggestion

**Algorithm:**

1. For FK relationships: automatically detect join type
   - Unique FK column → one-to-one
   - Non-unique FK column → one-to-many
   - Junction table (two FKs, no other significant columns) → many-to-many

2. For XML nesting: parent-child is always one-to-many (via maxOccurs) or one-to-one (maxOccurs=1)

### 4.3 Label Generation

**Algorithm:**

Transform column/table names into human-readable labels:

1. Split on `_`, `-`, or camelCase boundaries
2. Title-case each word
3. Expand common abbreviations: `dt` → "Date", `nm` → "Name", `cd` → "Code", `desc` → "Description", `ts` → "Timestamp", `qty` → "Quantity", `amt` → "Amount"
4. Apply domain-specific mappings: `pgm` → "Programme", `ch` → "Channel", `slt` → "Slot"
5. Strip common prefixes: `tbl_`, `t_`, `v_`, `fn_`

### 4.4 Recommended Field Detection

**Algorithm:**

A field is marked `recommended: true` if any of:
- It's part of the PK (identifiers are usually needed)
- Its name matches common report fields: "name", "title", "date", "time", "start", "end", "code", "status", "type", "description"
- It has a NOT NULL constraint (likely important)
- It's referenced by a FK from another table (key relationship field)

---

## 5. Visual Design

### 5.1 Canvas View

The main Mapping Studio view is a canvas showing entities as cards connected by relationship lines:

```
┌──────────────────┐         ┌──────────────────┐
│ Programme        │         │ Channel           │
│ ─────────────    │    1:N  │ ─────────────     │
│ ★ Title          │◄────────│ ★ Name            │
│ ★ StartDate      │         │   Code            │
│ ★ EndDate        │         │   Description     │
│   Duration       │         └──────────────────┘
│   Description    │
│   Status         │         ┌──────────────────┐
│                  │    1:N  │ Credit            │
│                  │◄────────│ ★ PersonName      │
│                  │         │   Role             │
└──────────────────┘         │   CharacterName   │
                             └──────────────────┘
```

- **Entity cards** show the business name and field list
- **★** marks recommended fields
- **Lines** connect related entities with relationship type labels
- **Drag** to reposition cards on the canvas
- **Click** an entity to expand its detail panel (edit fields, labels, types)
- **Click** a relationship line to edit the join type and path

### 5.2 Entity Detail Panel

```
┌──────────────────────────────────────────────┐
│ Programme                            [Edit ✎] │
│ "The main broadcast programme entity"         │
│                                               │
│ Fields (8)                    [Add Field] [↕]  │
│ ┌─────────────────────────────────────────┐   │
│ │ ★ Title           string    "Programme…" │   │
│ │ ★ StartDate       dateTime  "When the…"  │   │
│ │ ★ EndDate         dateTime  "When the…"  │   │
│ │   Duration        duration  "How long…"  │   │
│ │   Description     string    "Full desc…" │   │
│ │   Status          enum      "PLANNED, …" │   │
│ │   EpisodeNumber   integer   "Episode n…" │   │
│ │   SeasonNumber    integer   "Season nu…" │   │
│ └─────────────────────────────────────────┘   │
│                                               │
│ Relationships (2)                             │
│ ┌─────────────────────────────────────────┐   │
│ │ → Channel        one-to-many  via FK     │   │
│ │ → Credit         one-to-many  via FK     │   │
│ └─────────────────────────────────────────┘   │
│                                               │
│ Source: table "programme" (PostgreSQL)         │
└──────────────────────────────────────────────┘
```

### 5.3 Relationship Editor

```
┌──────────────────────────────────────────────┐
│ Relationship: Programme → Channel             │
│                                               │
│ Type:    ● One-to-One                         │
│          ○ One-to-Many (current)              │
│          ○ Many-to-Many                       │
│                                               │
│ Join:    programme.channel_id = channel.id     │
│          [Auto-detected from FK]              │
│                                               │
│ Label:   "Broadcasts on"                      │
│          [                               ]    │
│                                               │
│ [Save]  [Cancel]  [Remove Relationship]       │
└──────────────────────────────────────────────┘
```

---

## 6. Mapping Persistence

### 6.1 File Format

Mapping Specs are serialized as JSON with a schema version:

```json
{
  "$schema": "https://xfeb.mediagenix.com/mapping/v1.json",
  "schemaVersion": "1.0.0",
  "id": "mapping-daily-schedule",
  "name": "Daily Schedule Mapping",
  "version": 3,
  "source": {
    "type": "database",
    "identifier": "whatson-prod-pg",
    "schemaVersion": "sha256:abc123..."
  },
  "rootEntity": { ... },
  "entities": [ ... ],
  "glossary": [ ... ],
  "createdAt": "2026-02-16T10:00:00Z",
  "updatedAt": "2026-02-16T14:30:00Z",
  "createdBy": "john.doe",
  "description": "Maps the broadcast database for daily schedule reports",
  "tags": ["schedule", "daily", "broadcast"]
}
```

### 6.2 Storage Strategy

| Mode | Storage | Versioning |
|------|---------|-----------|
| Standalone | `localStorage` (max 10 mappings, FIFO) | Version counter in-memory |
| Embedded | `POST /api/v1/mappings` | Server-side versioning with history |
| File export | `.mapping.json` download/upload | Version in file metadata |

### 6.3 Versioning & Migration

When a source schema changes:
1. Hash the new schema
2. Compare against `source.schemaVersion` in the mapping
3. If different, run mapping diff:
   - **Added** source fields: flagged as "new, not yet mapped"
   - **Removed** source fields: flagged as "missing, mapping broken"
   - **Type-changed** fields: flagged as "type mismatch, review needed"
4. Present diff to user with suggested auto-fixes
5. User reviews, accepts/rejects, saves as new version

---

## 7. Performance Requirements

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Root detection | < 500ms for 100 tables | Unit benchmark |
| Relationship analysis | < 1s for 100 tables, 200 FKs | Unit benchmark |
| Label generation | < 100ms for 500 fields | Unit benchmark |
| Canvas render | < 200ms for 20 entities | React Profiler |
| Canvas scroll/pan | 60fps | Browser DevTools |
| Mapping save | < 100ms to localStorage | Performance.now() |
| Schema conversion | < 500ms for 100-entity mapping | Unit benchmark |
| Mapping diff | < 200ms for 100-entity mappings | Unit benchmark |

---

## 8. Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| Canvas keyboard navigation | Tab between entities, Arrow keys to navigate fields, Enter to edit |
| Screen reader support | Entity cards have aria-label with name and field count; relationships announced |
| Relationship lines | Non-visual alternative: relationship list in entity detail panel |
| Color independence | Relationship types distinguished by line style (solid/dashed/dotted), not just color |
| Focus management | Opening/closing panels returns focus appropriately |
| Zoom controls | Canvas zoom via keyboard (+/-) and pinch gesture |

---

## 9. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Mapping contains database metadata (table/column names) | Mapping files are local-first; server storage requires auth; no PII in mapping structure |
| Source schema hashes could reveal DB structure | SHA-256 hash is one-way; no reverse engineering possible |
| Mapping import from untrusted files | Zod validation of entire mapping structure; reject unexpected fields; size limit (1MB) |
| Connection identifiers in mapping | Store references (IDs), not credentials; connection details resolved server-side |

---

## 10. Dependencies

| Dependency | Purpose | Risk |
|------------|---------|------|
| XFEB Evolution Phase 4 (Database Ingestion) | DatabaseSchemaProvider produces source trees | Must be complete before Mapping Studio work begins |
| SchemaProvider interface (Phase 1) | Mapping Studio consumes provider output | Stable interface required |
| Canvas rendering library (TBD) | Entity diagram visualization | Evaluate: react-flow, elkjs, or custom SVG |
| Zod | Mapping file validation | Already adopted in Evolution Phase 1 |

### Canvas Library Evaluation

| Library | Pros | Cons | Recommendation |
|---------|------|------|---------------|
| **react-flow** | Rich interaction model, built-in zoom/pan, good a11y, MIT license | Heavy (~50KB gzipped), opinionated layout | **Preferred** — best balance of features and maturity |
| **elkjs** | Excellent auto-layout, lightweight | No built-in React bindings; layout-only, not interactive | Consider for auto-layout within react-flow |
| **Custom SVG** | Full control, no dependency | Significant effort for zoom/pan/drag; a11y is manual | Reject unless bundle size is critical |

---

## 11. Open Questions

| # | Question | Impact | Decision Needed By |
|---|----------|--------|-------------------|
| OQ-1 | Should mappings be shareable between XFEB instances (export/import) or only within a single deployment? | Determines persistence format and validation requirements | MS Epic 1 start |
| OQ-2 | Should the canvas support collaborative editing (multiple users editing same mapping)? | Major architecture impact; defer or simplify | MS Epic 2 start |
| OQ-3 | How many entities/relationships is realistic? 10? 50? 200? | Determines canvas rendering strategy | MS Epic 1 start |
| OQ-4 | Should mappings support computed/derived fields (e.g., "FullName = FirstName + LastName")? | Adds expression evaluation to the mapping engine | Defer to v2 |
| OQ-5 | Should mappings support cross-source entities (e.g., DB table + XML element in same mapping)? | Significant complexity; may not be needed initially | Defer to v2 |
