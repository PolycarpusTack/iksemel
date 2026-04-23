# Mapping Studio — Development Plan

**XFEB Mapping Studio — Development Plan**
**Reference:** MGX-XFEB-MS-DP-2026-001
**Parent:** MGX-XFEB-MS-SD-2026-001 (Solution Design)
**Date:** 16 February 2026

---

## 1. Overview

This plan covers the implementation of the Mapping Studio as a subproject of XFEB Evolution. The Mapping Studio is built **after** XFEB Evolution Phase 4 (Database Ingestion) is complete.

**Total duration:** 12 weeks (3 phases, 6 sprints)
**Team:** 2 engineers, 1 UX designer (part-time), 1 QA (part-time)

**Delivery approach:** Each phase produces a usable increment. Phase 1 delivers core modeling. Phase 2 delivers the visual canvas. Phase 3 delivers persistence, sharing, and integration.

---

## 2. Governance

### 2.1 Inherited Governance

This plan inherits the full governance framework from:
- MGX-XFEB-SD-2026-001 (DoR R1-R8, DoD D1-D12, QG1-QG7, RG1-RG7)
- MGX-XFEB-EVO-2026-001 (DoR R9-R11, DoD D13-D16, review cycles, debt cycles, clean code checks)

### 2.2 Mapping Studio DoR Addenda

| # | Criterion | Verification |
|---|-----------|-------------|
| R-MS1 | **Canvas complexity assessed** — stories involving canvas rendering must estimate entity/relationship counts and note performance implications | Tech Lead confirms |
| R-MS2 | **Mapping format impact assessed** — stories that change MappingSpec must include a migration note for existing saved mappings | Tech Lead confirms |

### 2.3 Mapping Studio DoD Addenda

| # | Criterion | Evidence |
|---|-----------|----------|
| D-MS1 | **Mapping contract tests pass** — all mapping engine functions pass the contract test suite | CI mapping test step |
| D-MS2 | **Canvas accessibility verified** — keyboard navigation tested for all canvas operations; screen reader tested for entity/relationship discovery | A11y checklist in PR |
| D-MS3 | **Mapping round-trip verified** — create mapping → save → load → convert to SchemaNode → verify tree matches original intent | CI round-trip test |

### 2.4 Review Cycles

Same cadence as evolution plan (Section 1.4), plus:

| Review | Frequency | Participants | Purpose |
|--------|-----------|-------------|---------|
| **UX Review** | Per canvas story | UX designer + Author | Validate interaction patterns, visual hierarchy, a11y |
| **Integration Review** | Per epic end | Evolution team lead + MS team | Verify Mapping Studio output integrates cleanly with report builder |

### 2.5 Technical Debt Cycles

| Phase | Debt Sprint | Ongoing Reserve | Refactor Gate Budget |
|-------|-------------|-----------------|---------------------|
| MS Phase 1 | 1 day | 15% | 2 days |
| MS Phase 2 | 2 days | 15% | 2 days |
| MS Phase 3 | 2 days | 15% | 2 days |

### 2.6 Clean Code Checks

All automated and manual checks from evolution plan Section 1.6 apply, plus:

**Additional automated checks:**

| Check | Tool | Threshold | Blocks PR |
|-------|------|-----------|-----------|
| Mapping engine purity | Custom ESLint rule | engine/mapping/ has zero React imports | Yes |
| Canvas component size | ESLint `max-lines` | Canvas components <= 250 lines (relaxed for diagram complexity) | Yes |
| Mapping file validation | Zod schema tests | All mapping fixtures parse without error | Yes |

**Additional manual checks:**

| Check | Reviewer verifies |
|-------|-------------------|
| Canvas interactions | Drag, click, zoom feel responsive and predictable |
| Entity card clarity | Business names and field lists are readable at default zoom |
| Relationship line readability | Lines don't overlap; labels are positioned clearly |

---

## 3. MS Phase 1 — Mapping Engine & Entity Modeling

**Duration:** 4 weeks (2 sprints)
**Goal:** Core mapping engine with entity/relationship modeling; text-based UI (no canvas yet)
**Deliverable:** Users can create, edit, and save mappings via a panel-based UI

---

### Epic MS.1.1 — Mapping Engine Core

**Duration:** Sprint 1 (Weeks 1-2)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| MS.1.1.1 | Define mapping type system: `MappingSpec`, `EntityMapping`, `FieldMapping`, `GlossaryEntry` with Zod schemas for validation | 5 | Types defined in `engine/mapping/types.ts`; Zod schemas validate all fixtures; forward-compatible (unknown fields preserved) |
| MS.1.1.2 | Implement root entity detection algorithm: score-based ranking of candidate root entities from SchemaNode tree | 5 | Given broadcast database schema, "Programme" is top candidate; given 3 test schemas, top candidate is correct in all 3; scores are deterministic |
| MS.1.1.3 | Implement relationship analysis: FK detection → relationship type classification (1:1, 1:N, M:N with junction detection) | 8 | Given a schema with 5 FK relationships, then all 5 are detected; 1:1 vs 1:N correctly classified; junction table for M:N detected |
| MS.1.1.4 | Implement label generation: column/table names → human-readable business labels with abbreviation expansion and domain-specific mappings | 5 | Given "pgm_start_dt", then label is "Programme Start Date"; given "channel_nm", then label is "Channel Name"; 20+ test cases pass |
| MS.1.1.5 | Implement recommended field detection: PK, common names, NOT NULL, FK-referenced fields marked as recommended | 3 | Given a table with 15 columns, then 5-8 are marked recommended; PK is always recommended; common fields (name, date, code) recommended |
| MS.1.1.6 | Implement `mappingToSchema()`: convert MappingSpec → SchemaNode[] tree compatible with existing XFEB pipeline | 5 | Given a mapping with 3 entities and 20 fields, then output SchemaNode tree has correct structure; leaf nodes have correct types; repeating entities have maxOccurs="unbounded" |
| MS.1.1.7 | Implement mapping validation: check for orphaned fields, duplicate IDs, missing root, invalid relationship paths, type mismatches | 3 | Given 5 invalid mapping scenarios, then each produces specific validation error; valid mappings pass with no errors |
| MS.1.1.8 | Implement mapping serializer: deterministic JSON serialization with version field and Zod deserialization with backward compatibility | 3 | Given a mapping, when serialized and deserialized, then result is identical; given a v1 mapping loaded by v2 code, then unknown fields preserved |
| MS.1.1.9 | Build mapping engine test suite: 30+ tests covering all algorithms | 5 | All tests pass; coverage >= 90% for `engine/mapping/` |

#### DoD Addendum
- Coverage: 90%+ for `engine/mapping/`
- `mappingToSchema()` output passes SchemaProvider contract tests
- All algorithms are pure functions with deterministic output

#### Quality Gate
- QG1-QG7 + D-MS1 + D-MS3 plus:
- **QG-MS.1.1-A:** Root detection produces correct top candidate for 5 test schemas
- **QG-MS.1.1-B:** `mappingToSchema()` output feeds into selection + generation pipeline end-to-end

#### Refactor Gate
- RG1-RG7 plus:
- All algorithms are in separate files (root-detector, relationship-analyzer, label-generator)
- Abbreviation/domain mappings are in a data file, not hardcoded in functions
- No mapping logic depends on a specific source type (database, XML, etc.)

---

### Epic MS.1.2 — Entity Modeling UI

**Duration:** Sprint 2 (Weeks 3-4)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| MS.1.2.1 | Implement MappingStudio container: layout with entity panel (left), detail panel (right), toolbar (top) | 3 | Layout renders; panels are resizable; responsive down to 1024px |
| MS.1.2.2 | Implement EntityPanel: list of entities as cards with business name, field count, relationship indicators | 5 | Given 5 entities, then 5 cards shown; each shows name, "8 fields", "2 relationships"; click expands detail panel |
| MS.1.2.3 | Implement EntityCard: editable business name, description, field list, relationship list | 5 | Given an entity, then name is editable inline; description expands on click; fields listed with type badges and recommended stars |
| MS.1.2.4 | Implement FieldList: sortable field list within entity; each field shows label, type, recommended status, source ref | 3 | Given 10 fields, then list renders; drag-to-reorder works; clicking field opens inline editor |
| MS.1.2.5 | Implement field inline editor: edit label, type override, display format, recommended toggle, notes | 3 | Given a field, when editor opens, then all fields are editable; save persists changes; cancel discards |
| MS.1.2.6 | Implement RelationshipEditor: select type (1:1, 1:N, M:N), view/edit join path, add label | 3 | Given a relationship, when editor opens, then type is selectable; join path is shown; label is editable |
| MS.1.2.7 | Implement "Create from Schema" flow: load a SchemaNode tree (from any provider), run root detection → relationship analysis → label generation, create initial MappingSpec | 5 | Given a database schema, when "Create Mapping" is clicked, then root detection suggests candidates; user selects one; mapping is auto-populated with entities and fields |
| MS.1.2.8 | Implement "Add Entity" and "Remove Entity" actions | 2 | Given a mapping, when "Add Entity" is clicked, then entity picker shows unmapped source tables/elements; when removed, then entity is removed and relationships cleaned up |
| MS.1.2.9 | Implement mapping save to localStorage with version increment | 2 | Given changes to a mapping, when saved, then version increments; mapping persists to localStorage; "Unsaved changes" indicator works |
| MS.1.2.10 | Implement keyboard navigation for all mapping studio interactions | 3 | Full mapping flow completable via keyboard; Tab through entities, Enter to edit, Escape to cancel |
| MS.1.2.11 | A11y audit for mapping studio panel UI | 2 | axe-core: zero critical/serious violations; keyboard walkthrough documented |

#### DoD Addendum
- Coverage: 80%+ for mapping studio components
- A11y: keyboard walkthrough documented; axe clean
- Full flow: load schema → create mapping → edit entities → save → load → convert to SchemaNode → verify

#### Quality Gate
- QG1-QG7 + D-MS1, D-MS2, D-MS3 plus:
- **QG-MS.1.2-A:** User test: 3 people create a mapping from a database schema without assistance
- **QG-MS.1.2-B:** Mapping → SchemaNode → selection → generation → download works end-to-end

#### Refactor Gate
- RG1-RG7 plus:
- Entity state managed in reducer, not component-local state
- All mapping mutations go through a centralized mapping reducer
- No canvas code yet — panel UI is complete and testable on its own

---

### MS Phase 1 Technical Debt Review

**Duration:** 1 day

**Focus:**
| ID | Item | Type | Severity |
|----|------|------|----------|
| TD-MS1.1 | Label generation heuristics are English-only; may need i18n config | Design Debt | Medium |
| TD-MS1.2 | Entity panel doesn't scale well beyond 15 entities (visual clutter) | Code Debt | Low |
| TD-MS1.3 | Relationship analysis assumes clean FK constraints; may miss implicit relationships | Design Debt | Medium |

---

## 4. MS Phase 2 — Visual Canvas

**Duration:** 4 weeks (2 sprints)
**Goal:** Interactive visual diagram of entities and relationships; auto-layout; drag-and-drop
**Deliverable:** Users can visually model data relationships on a canvas

---

### Epic MS.2.1 — Canvas Foundation

**Duration:** Sprint 3 (Weeks 5-6)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| MS.2.1.1 | Evaluate and integrate canvas library (react-flow preferred): set up basic canvas with zoom, pan, and node rendering | 5 | Canvas renders with zoom/pan; 10 entity nodes positioned correctly; performance: 60fps scroll with 20 nodes |
| MS.2.1.2 | Implement entity node component: renders entity as a card with business name, field summary, recommended field indicators | 5 | Entity nodes show name, field count, type distribution; click selects entity; double-click opens detail panel |
| MS.2.1.3 | Implement relationship edges: directed lines between entities with type labels (1:1, 1:N, M:N) and line-style differentiation (solid/dashed/dotted) | 5 | Edges render between connected entities; labels show relationship type; line styles differentiate types; edges update when nodes move |
| MS.2.1.4 | Implement auto-layout: use elkjs (or equivalent) to automatically position entities in a readable hierarchy based on relationships | 5 | Given 10 entities with relationships, when auto-layout runs, then entities are positioned without overlapping; root entity is at top/left; related entities are nearby |
| MS.2.1.5 | Implement node drag: entities can be repositioned on canvas; positions persist | 3 | Given an entity, when dragged, then it moves smoothly; position saved in mapping spec; auto-layout can be re-triggered to reset positions |
| MS.2.1.6 | Implement canvas toolbar: zoom controls (+/-/fit), auto-layout button, toggle labels, toggle minimap | 3 | Toolbar controls work; keyboard shortcuts (Ctrl+= zoom in, Ctrl+- zoom out, Ctrl+0 fit) |
| MS.2.1.7 | Implement canvas minimap: overview of entire canvas with viewport indicator | 2 | Minimap shows all entities; current viewport highlighted; click minimap to navigate |
| MS.2.1.8 | Canvas keyboard navigation: Tab between entities, Arrow keys to navigate within entity, Enter to select/expand | 3 | Full canvas navigable via keyboard; focus indicators visible; screen reader announces entity names |

#### DoD Addendum
- Coverage: 75%+ for canvas components (lower due to rendering complexity)
- Performance: 20 entities + 25 relationships renders at 60fps
- A11y: canvas keyboard navigation works; non-visual alternative (entity panel) remains functional

#### Quality Gate
- QG1-QG7 + D-MS2 plus:
- **QG-MS.2.1-A:** Canvas renders 20 entities without visual overlap after auto-layout
- **QG-MS.2.1-B:** Canvas performance: zoom/pan at 60fps with 20 entities (measured via Performance API)
- **QG-MS.2.1-C:** A11y: full mapping flow completable without canvas (entity panel provides full functionality)

#### Refactor Gate
- RG1-RG7 plus:
- Canvas library is wrapped in an abstraction (not directly imported by business components)
- Auto-layout algorithm is a pure function (graph → positions), not tied to react-flow internals
- Entity node component shares types/logic with EntityCard (no duplication)

---

### Epic MS.2.2 — Canvas Interactions

**Duration:** Sprint 4 (Weeks 7-8)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| MS.2.2.1 | Implement drag-to-connect: drag from one entity to another to create a relationship; show preview line during drag; open RelationshipEditor on drop | 5 | Given two unconnected entities, when user drags from one to the other, then a preview line follows the cursor; on drop, RelationshipEditor opens with pre-filled entity names |
| MS.2.2.2 | Implement entity creation on canvas: drag from a palette of unmapped source entities onto the canvas | 3 | Given 3 unmapped tables, when palette is open, then they're listed; dragging one onto canvas creates a new entity node at the drop position |
| MS.2.2.3 | Implement entity removal from canvas: right-click context menu or Delete key | 2 | Given a selected entity, when Delete pressed, then confirmation dialog; on confirm, entity removed from mapping; relationships cleaned up |
| MS.2.2.4 | Implement multi-select: Shift+click or drag-rectangle to select multiple entities; bulk actions (move, delete, align) | 3 | Given 3 selected entities, when dragged, then all 3 move together; when Delete pressed, then all 3 removed (with confirmation) |
| MS.2.2.5 | Implement relationship context menu: right-click a relationship line to edit type, remove, or reverse direction | 2 | Given a relationship, when right-clicked, then menu shows Edit/Remove/Reverse; each action works correctly |
| MS.2.2.6 | Implement field expansion on canvas: click entity to show/hide field list within the entity card on canvas | 3 | Given a compact entity node, when clicked, then it expands to show field list; clicking again collapses; layout adjusts |
| MS.2.2.7 | Implement canvas undo/redo: Ctrl+Z / Ctrl+Shift+Z for canvas operations (move, create, delete, connect) | 5 | Given 5 canvas operations, when Ctrl+Z pressed 3 times, then state reverts 3 steps; Ctrl+Shift+Z re-applies |
| MS.2.2.8 | Implement canvas export: download canvas as PNG/SVG for documentation; include in mapping metadata for thumbnails | 3 | Given a canvas, when "Export Image" clicked, then PNG downloads with all entities and relationships visible |
| MS.2.2.9 | Implement "Preview as Report Schema" button: show the SchemaNode tree that the mapping produces, side-by-side with the canvas | 3 | Given a mapping with 5 entities, when preview clicked, then a tree view shows the resulting SchemaNode structure; fields grouped under their entities |
| MS.2.2.10 | E2E test for canvas: create mapping → position entities → connect relationships → preview → convert to schema | 5 | E2E test passes in Chrome, Firefox, Edge |

#### DoD Addendum
- Coverage: 75%+ for canvas interaction components
- Undo/redo reliable for 20+ operations
- Canvas image export produces readable output at any zoom level

#### Quality Gate
- QG1-QG7 + D-MS2, D-MS3 plus:
- **QG-MS.2.2-A:** Canvas interactions tested with 20 entities: all operations responsive
- **QG-MS.2.2-B:** Undo/redo stress test: 50 rapid operations without state corruption
- **QG-MS.2.2-C:** Canvas export image includes all entities/relationships at readable resolution

#### Refactor Gate
- RG1-RG7 plus:
- Canvas operations dispatch through the same mapping reducer as panel operations (no separate state)
- Context menu items are data-driven (not hardcoded per entity type)
- Undo/redo uses the same history pattern as selection history (engine/selection/history.ts)

---

### MS Phase 2 Technical Debt Review

**Duration:** 1.5 days

**Focus:**
| ID | Item | Type | Severity |
|----|------|------|----------|
| TD-MS2.1 | Canvas library (react-flow) adds ~50KB to bundle; may need code splitting | Dependency Debt | Medium |
| TD-MS2.2 | Auto-layout may not produce optimal results for all graph shapes | Design Debt | Low |
| TD-MS2.3 | Canvas undo/redo and selection undo/redo are separate history stacks; consider unifying | Design Debt | Medium |
| TD-MS2.4 | Entity node component duplicates some rendering logic from EntityCard; should extract shared component | Code Debt | Low |

---

## 5. MS Phase 3 — Persistence, Sharing & Integration

**Duration:** 4 weeks (2 sprints)
**Goal:** Server-side persistence, mapping sharing, wizard integration, glossary, diff viewer
**Deliverable:** Production-ready Mapping Studio integrated with XFEB report builder and wizard

---

### Epic MS.3.1 — Persistence & Sharing

**Duration:** Sprint 5 (Weeks 9-10)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| MS.3.1.1 | Implement mapping memory store: in-memory CRUD with async interface matching TemplateStore pattern | 3 | Store supports create, read, update, delete, list; all operations async; compatible with both localStorage and API backends |
| MS.3.1.2 | Implement mapping API persistence (embedded mode): `GET/POST/PUT/DELETE /api/v1/mappings` with versioning | 5 | Given embedded mode, then mappings persist to server; version history available; concurrent edit detection (optimistic locking via version number) |
| MS.3.1.3 | Implement mapping browser: grid/list view of saved mappings with name, source type, entity count, last modified, version | 3 | Given 10 saved mappings, then browser shows all; filter by source type; sort by name/date; click opens mapping in studio |
| MS.3.1.4 | Implement mapping export/import: download as `.mapping.json` file; import with validation and conflict detection | 3 | Given a mapping file, when imported, then Zod validates structure; conflicts with existing mapping detected (same ID, different version); user chooses overwrite or rename |
| MS.3.1.5 | Implement mapping diff viewer: compare two mapping versions; show added/removed/modified entities and fields | 5 | Given mapping v2 and v3, when diffed, then changes listed: "Added entity 'Genre'", "Removed field 'Programme.OldField'", "Changed type of 'Credit.Role' from string to enum" |
| MS.3.1.6 | Implement schema change detection: when source schema changes, compare against mapping's recorded schema version and report impact | 5 | Given a mapping against schema v1, when schema v2 loaded, then impact report shows: "2 fields removed, 1 type changed, 3 fields added (not yet mapped)" |
| MS.3.1.7 | Implement auto-migration suggestions: for field renames, suggest mapping updates; for type changes, suggest type override; for removals, suggest alternatives | 5 | Given a renamed column (old_name -> new_name), then suggestion "Update sourceRef from 'old_name' to 'new_name'"; user can accept or dismiss |

#### DoD Addendum
- Coverage: 85%+ for persistence and diff modules
- Mapping round-trip: save → load → save → compare = identical
- Schema change detection accuracy: 100% for additions/removals, >= 90% for renames (heuristic)

#### Quality Gate
- QG1-QG7 + D-MS1, D-MS3 plus:
- **QG-MS.3.1-A:** Persistence tested with 20+ concurrent save/load operations (no data loss)
- **QG-MS.3.1-B:** Schema migration tested with 3 real schema version transitions
- **QG-MS.3.1-C:** Diff viewer correctly displays all change types

#### Refactor Gate
- RG1-RG7 plus:
- Storage abstraction allows swapping localStorage for API without changing any UI code
- Diff algorithm is a pure function reusable for both mapping diff and schema change detection
- Migration suggestions are data (not imperative code); new suggestion types can be added without changing the engine

---

### Epic MS.3.2 — Integration & Glossary

**Duration:** Sprint 6 (Weeks 11-12)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| MS.3.2.1 | Integrate mapping studio with report builder: "Use Mapping" option in schema upload; selected mapping converts to SchemaNode tree and feeds into selection | 5 | Given a saved mapping, when "Use Mapping" selected, then SchemaNode tree renders with business labels; selection, filtering, generation all work |
| MS.3.2.2 | Integrate mapping with wizard: wizard Step 3 shows mapping entities as business objects instead of raw schema nodes when a mapping is active | 3 | Given an active mapping, when wizard Step 3 loads, then entities show business names ("Programme" instead of "tbl_programme"); field suggestions use mapping's recommended flags |
| MS.3.2.3 | Implement glossary panel: define business terms (e.g., "Slot = a time period in the broadcast schedule"); terms highlighted in entity/field labels with tooltip definitions | 5 | Given 5 glossary entries, then matching terms in entity/field labels are highlighted; hovering shows definition; glossary panel shows all entries |
| MS.3.2.4 | Implement glossary auto-suggestion: when creating/editing entities, suggest relevant glossary terms based on source names | 2 | Given entity "slot", and glossary contains "Slot", then suggestion appears "Add glossary link: Slot" |
| MS.3.2.5 | Implement mapping as template data: templates can reference a mapping ID; applying a template with mapping loads the mapping first | 3 | Given a template referencing mapping-123, when applied, then mapping is loaded, converted to schema, then template configuration applied |
| MS.3.2.6 | Implement "Create Mapping" entry in wizard Step 2: after loading data source, user can create a new mapping or select an existing one before proceeding | 3 | Given wizard Step 2 with database source, then options show "Create New Mapping" and "Use Existing Mapping" alongside "Skip (use raw schema)" |
| MS.3.2.7 | Implement bridge support: `LOAD_MAPPING` message type for embedded mode; mapping can be pushed from host application | 3 | Given a LOAD_MAPPING message with mapping JSON, when received, then mapping is loaded and applied; schema tree renders with business labels |
| MS.3.2.8 | Add Mapping Studio tab to XFEB: new tab "Mapping" between "Templates" and "Guide" | 2 | Tab renders Mapping Studio; state persists when switching tabs; tab shows "No mapping" prompt when no mapping active |
| MS.3.2.9 | Golden tests for mapping → report pipeline: 2 fixtures (simple mapping, complex mapping with M:N relationships) | 3 | Golden tests pass; mapping → schema → selection → generation → package produces correct output |
| MS.3.2.10 | Full E2E test: create mapping from DB schema → use in report builder → download package | 5 | E2E test passes in Chrome, Firefox, Edge |
| MS.3.2.11 | Documentation: Mapping Studio user guide covering creation, editing, sharing, integration with report builder | 3 | Guide reviewed by 2 non-technical users; both understand the concepts |

#### DoD Addendum
- Coverage: 80%+ for integration components
- Full pipeline: DB schema → mapping → report → package works end-to-end
- Documentation complete and reviewed

#### Quality Gate
- QG1-QG7 + D-MS1, D-MS2, D-MS3 plus:
- **QG-MS.3.2-A:** Integration test: mapping → report builder → download produces valid package
- **QG-MS.3.2-B:** Wizard with mapping: 3 non-technical users complete flow without assistance
- **QG-MS.3.2-C:** Bridge: LOAD_MAPPING → edit → PACKAGE_READY round-trip works

#### Refactor Gate
- RG1-RG7 plus:
- Integration points are clean: report builder receives SchemaNode[] (doesn't know about mappings)
- Glossary is optional: removing it has zero impact on mapping functionality
- Bridge message handling follows same pattern as existing bridge messages (Zod validation, discriminated union)
- Tab registration follows existing pattern (no special-casing for Mapping tab)

---

### MS Phase 3 Technical Debt Review (Final)

**Duration:** 1.5 days

**Focus:**
| ID | Review Area | Action |
|----|-------------|--------|
| TD-MS3.1 | Canvas library weight — measure actual bundle impact with code splitting | Bundle analysis |
| TD-MS3.2 | Mapping store interface consistency with template store — consider unifying | Architecture review |
| TD-MS3.3 | Glossary feature adoption — is it being used? Consider making it a v2 feature if underutilized | Product review |
| TD-MS3.4 | Mapping to SchemaNode conversion completeness — are all edge cases handled? | Test coverage review |
| TD-MS3.5 | Documentation accuracy — does the user guide match the final product? | Doc review |

**Output:**
- Mapping Studio Architecture Review
- Updated Maintenance Runbook (add: how to extend mapping engine, how to add new source types, how to customize label generation)
- Remaining debt items prioritised for ongoing maintenance

---

## 6. Summary Timeline

```
MS Phase 1: Mapping Engine & Entity Modeling           [Weeks 1-4]
  ├── Epic MS.1.1: Mapping Engine Core                 ██████
  ├── Epic MS.1.2: Entity Modeling UI                  ██████
  └── MS Phase 1 Debt Review                           █

MS Phase 2: Visual Canvas                              [Weeks 5-8]
  ├── Epic MS.2.1: Canvas Foundation                   ██████
  ├── Epic MS.2.2: Canvas Interactions                 ██████
  └── MS Phase 2 Debt Review                           █

MS Phase 3: Persistence, Sharing & Integration         [Weeks 9-12]
  ├── Epic MS.3.1: Persistence & Sharing               ██████
  ├── Epic MS.3.2: Integration & Glossary              ██████
  └── MS Phase 3 Debt Review (Final)                   █
```

**Total duration:** 12 weeks (~3 months)
**Can start:** After XFEB Evolution Phase 4 is complete (or in parallel with Phase 5 if DB schema trees are available)
**Combined XFEB Evolution + Mapping Studio:** ~7.5 months + ~3 months = ~10.5 months total (with overlap: ~9 months if MS starts during Phase 5)

---

## 7. Dependency Map

```
XFEB Evolution Phase 1 (Canonical Model)
  └──> SchemaProvider interface (required by MS)

XFEB Evolution Phase 4 (Database Ingestion)
  └──> DatabaseSchemaProvider (primary source for MS)

MS Phase 1 (Engine + Entity UI)
  └──> MS Phase 2 (Canvas) requires entity model
  └──> MS Phase 3 (Integration) requires both engine and canvas

XFEB Evolution Phase 3 (Report Wizard)
  └──> MS Phase 3 integrates with wizard steps

XFEB Evolution Phase 5 (Recommendations)
  └──> MS mappings can feed recommendation patterns
```

---

## 8. Risk Register

| ID | Risk | Impact | Likelihood | Mitigation |
|----|------|--------|-----------|------------|
| RMS-1 | Canvas library (react-flow) has breaking changes or becomes unmaintained | High | Low | Abstraction layer isolates business code; evaluate alternatives annually |
| RMS-2 | FK-based relationship detection produces incorrect trees for legacy databases with inconsistent constraints | High | Medium | Manual relationship editing UI; "override" mode for power users |
| RMS-3 | Mapping Studio adds too much complexity for non-technical users | Medium | Medium | Panel UI works without canvas; wizard integration provides guided path; user testing validates |
| RMS-4 | Bundle size impact of canvas library unacceptable | Medium | Low | Lazy-load mapping studio tab; code-split canvas from panel UI |
| RMS-5 | Mapping persistence conflicts in multi-user embedded environments | Medium | Medium | Optimistic locking via version numbers; conflict detection on save |
| RMS-6 | Schema change detection produces false positives (rename vs. add+remove) | Medium | Medium | Configurable similarity threshold; user confirms migrations before applying |

---

## 9. Success Metrics

| Metric | Target | Measured By |
|--------|--------|-------------|
| Mapping creation success rate | >= 80% of started mappings reach "saved" state | Analytics |
| Time to create first mapping | < 15 minutes for a 10-table database | User testing |
| Mapping reuse rate | >= 50% of reports use a saved mapping | Analytics |
| Schema migration success | >= 90% of auto-suggestions accepted by users | Analytics |
| User satisfaction | >= 4/5 rating from pilot users | Survey |
| Canvas performance | 60fps with 20 entities on mid-range hardware | Benchmark |
| Bundle size impact | < 60KB gzipped (mapping studio lazy chunk) | Build metrics |
