# XFEB Evolution Plan

**XML Filter & Export Builder — Multi-Source Evolution**
**Reference:** MGX-XFEB-EVO-2026-001 | **Predecessor:** MGX-XFEB-SD-2026-001
**Date:** 16 February 2026

---

## 0. Purpose & Scope

This plan extends the XFEB development plan (MGX-XFEB-SD-2026-001) to evolve XFEB from an XSD-only tool into a **source-agnostic report builder** where clients can build reports without knowing the full schema structure.

**In scope:** Canonical model hardening, XML sample inference, report wizard UX, golden tests, a11y CI gates, database ingestion, rule-based recommendations, enterprise readiness.

**Out of scope:** Mapping Studio (see `mapping-studio/` subproject). AI/LLM-based features (deferred until rule-based recommendations prove insufficient).

**Prerequisite:** Phases 1-2 of MGX-XFEB-SD-2026-001 (standalone + WHATS'ON integration) are complete or near-complete.

---

## 1. Governance Framework

### 1.1 Inherited Governance

This plan inherits and extends the governance framework from MGX-XFEB-SD-2026-001:
- Definition of Ready (DoR) R1-R8
- Definition of Done (DoD) D1-D12
- Quality Gate Process QG1-QG7
- Refactor Gate Process RG1-RG7
- Technical Debt Review Process

All inherited gates remain in force. The addenda below apply **in addition** to the inherited criteria.

### 1.2 Evolution-Specific DoR Addenda

| # | Criterion | Verification |
|---|-----------|-------------|
| R9 | **Source-agnostic impact assessed** — stories must document which `SchemaProvider` implementations are affected and whether the canonical model needs extension | Tech Lead confirms |
| R10 | **Migration impact assessed** — stories that change SchemaNode or provider interfaces must include a migration note for existing saved sessions and templates | Tech Lead confirms |
| R11 | **Generation pipeline impact assessed** — stories introducing non-XML sources must specify whether the XML intermediary path or a new generation path is used | Architecture review |

### 1.3 Evolution-Specific DoD Addenda

| # | Criterion | Evidence |
|---|-----------|----------|
| D13 | **Golden tests pass** — end-to-end package generation golden tests for all registered source types produce unchanged output (or diffs are reviewed and approved) | CI golden test step |
| D14 | **A11y CI gate passes** — axe-playwright scan of all new/modified UI pages reports zero critical/serious violations | CI a11y step |
| D15 | **Provider contract tests pass** — new SchemaProvider implementations pass the shared provider contract test suite | CI provider contract step |
| D16 | **Backward compatibility verified** — existing saved sessions, templates, and bridge messages still load correctly after the change | CI compatibility test step |

### 1.4 Review Cycles

Each phase uses a structured review cadence:

| Review | Frequency | Participants | Purpose |
|--------|-----------|-------------|---------|
| **Code Review** | Every PR | Author + 1 reviewer (min) | Quality, conventions, security |
| **Architecture Review** | Per epic start | Tech Lead + Author | Verify approach fits canonical model and provider architecture |
| **Mid-Sprint Check** | Weekly | Team standup | Surface blockers, scope creep, tech debt accumulation |
| **Sprint Review** | End of sprint | Team + PO | Demo, acceptance, feedback |
| **Quality Gate** | End of epic | Tech Lead + QA Lead + PO | Formal gate checklist (QG1-QG7 + epic addenda) |
| **Refactor Gate** | After quality gate | Tech Lead | Code health checklist (RG1-RG7 + epic addenda) |
| **Phase Review** | End of phase | Full team + stakeholders | Phase objectives met, debt review, next phase readiness |

### 1.5 Technical Debt Cycles

Each phase includes structured debt management:

```
[Phase Start]
    │
    ├── Day 1-3: Tech Debt Sprint (remediate top items from previous phase)
    │
    ├── Ongoing: 15% sprint capacity reserved for debt items
    │
    ├── Per-Epic: Refactor Gate catches new debt
    │
    ├── Per-Sprint: New debt items logged to Tech Debt Register
    │
    └── Phase End: Technical Debt Review
         ├── Collect (static analysis, profiling, dependency audit, architecture conformance)
         ├── Classify (severity × type × cost-of-delay)
         ├── Prioritise (WSJF)
         ├── Plan (top items into next phase's debt sprint)
         └── Report (trend analysis, remediation plan)
```

**Debt budget per phase:**
| Phase | Debt Sprint | Ongoing Reserve | Refactor Gate Budget |
|-------|-------------|-----------------|---------------------|
| Phase 1 (Hardening) | 2 days | 10% | 1.5 days/epic |
| Phase 2 (XML Inference) | 2 days | 15% | 2 days/epic |
| Phase 3 (Report Wizard) | 3 days | 15% | 2 days/epic |
| Phase 4 (DB Ingestion) | 3 days | 15% | 2.5 days/epic |
| Phase 5 (Recommendations) | 2 days | 10% | 1.5 days/epic |
| Phase 6 (Enterprise) | 3 days | 15% | 2 days/epic |

### 1.6 Clean Code & Best Practices Checks

Enforced at every PR via CI and reviewer checklists:

**Automated (CI pipeline):**

| Check | Tool | Threshold | Blocks PR |
|-------|------|-----------|-----------|
| TypeScript strict mode | `tsc --noEmit` | Zero errors | Yes |
| No `any` escapes | ESLint rule `@typescript-eslint/no-explicit-any` | Zero violations (or ADR-documented) | Yes |
| Cyclomatic complexity | ESLint `complexity` | Per function <= 15 | Yes |
| Cognitive complexity | ESLint `sonarjs/cognitive-complexity` | Per function <= 20 | Yes |
| File length | ESLint `max-lines` | Components <= 200, engine <= 400 | Yes |
| No circular deps | `madge --circular` | Zero cycles | Yes |
| Layer boundaries | Custom ESLint rule | engine/ cannot import components/ | Yes |
| CSS Modules only | ESLint rule | No inline `style=` in JSX (except dynamic calc) | Yes |
| Design token usage | Stylelint | No hardcoded colors/spacing in CSS | Yes |
| Unused exports | `ts-prune` | Zero unused exports | Warning |
| Lint + format | ESLint + Prettier | Zero violations | Yes |
| Unit tests | Vitest | All pass, coverage >= thresholds | Yes |
| A11y scan | axe-playwright | Zero critical/serious | Yes |
| Golden tests | Custom | All pass or diff reviewed | Yes |
| Bundle size | Vite bundle analyzer | < budget (defined per phase) | Yes |

**Manual (reviewer checklist):**

| Check | Reviewer verifies |
|-------|-------------------|
| Single Responsibility | Each function/component does one thing |
| Naming clarity | Variables, functions, types have self-documenting names |
| No premature abstraction | Helpers/utilities only created when used 3+ times |
| Immutability | State updates use spread/map, never mutation |
| Error boundaries | External data (bridge, file upload, API) validated at entry point |
| No over-engineering | Solution is the simplest that satisfies the requirement |
| Barrel exports intentional | Only public API exported from index.ts |
| Test quality | Tests assert behavior not implementation; no snapshot-only tests |
| Accessibility | ARIA roles, keyboard nav, focus management for new UI |
| Documentation | JSDoc on exported functions; ADR for structural decisions |

---

## 2. Phase 1 — Foundation Hardening

**Duration:** 4 weeks (2 sprints)
**Goal:** Make SchemaNode source-agnostic, establish golden test infrastructure, add a11y CI gates, harden runtime validation
**Team:** 2 engineers, 1 QA (part-time)

### 2.1 Architecture Decision

**ADR-EVO-001: Canonical Model Extension**

The `SchemaNode` interface gains source provenance metadata without breaking existing consumers:

```typescript
// New fields added to SchemaNode (all optional for backward compat)
interface SchemaNode {
  // ... existing fields unchanged ...

  /** Where this node was inferred from */
  sourceType?: 'xsd' | 'database' | 'xml-sample' | 'manual';

  /** Provider-specific origin trace */
  provenance?: {
    provider: string;       // e.g. 'XsdSchemaProvider', 'PostgresSchemaProvider'
    source: string;         // e.g. file path, connection string (sanitised), sample hash
    inferredAt?: string;    // ISO timestamp for inferred schemas
    confidence?: number;    // 0-1 for inferred schemas (xml-sample, AI suggestions)
  };
}
```

**ADR-EVO-002: SchemaProvider Interface**

```typescript
interface SchemaProvider {
  readonly id: string;
  readonly displayName: string;
  readonly sourceType: SchemaNode['sourceType'];

  /** Whether this provider is available in the current environment */
  isAvailable(): boolean;

  /** Parse/introspect source into canonical SchemaNode tree */
  provide(input: ProviderInput): Promise<ProvideResult>;

  /** Validate that a previously-provided schema is still compatible with its source */
  validate?(input: ProviderInput, existing: SchemaNode[]): Promise<ValidationResult>;
}

interface ProvideResult {
  roots: readonly SchemaNode[];
  warnings: readonly ParseWarning[];
  nodeCount: number;
  metadata: Record<string, unknown>;
}
```

**Decision:** All downstream features (selection, generation, filter, templates, bridge) operate exclusively on `SchemaNode`. They never know which provider created the tree.

---

### Epic 1-EVO.1 — Canonical Model & Provider Architecture

**Duration:** Sprint 1 (Weeks 1-2)
**Refactor Gate Budget:** 1.5 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 1E.1.1 | Add `sourceType` and `provenance` optional fields to `SchemaNode` type | 2 | Existing code compiles without changes; new fields are `readonly` and optional; type tests pass |
| 1E.1.2 | Define `SchemaProvider` interface with `provide()`, `isAvailable()`, and optional `validate()` | 3 | Interface is defined in `types/`; documented with JSDoc and examples |
| 1E.1.3 | Create `SchemaProviderRegistry` with `register()`, `get()`, `list()` following the existing XSLT registry pattern | 3 | Registry accepts providers; `list()` returns only available providers; duplicate IDs throw |
| 1E.1.4 | Wrap existing `parseXSD()` as `XsdSchemaProvider` implementing the new interface | 3 | XsdSchemaProvider passes all existing parser tests; output includes `sourceType: 'xsd'` and provenance metadata |
| 1E.1.5 | Create `SchemaProvider` contract test suite: 15+ tests that any provider must pass | 5 | Contract tests verify: output conforms to SchemaNode, ids are unique, tree is frozen, warnings are structured, nodeCount matches actual count |
| 1E.1.6 | Update `AppState` and `app-state.tsx` reducer to store provider metadata alongside schema | 2 | `LOAD_SCHEMA` action accepts `ProvideResult`; state includes provider info; session persistence includes sourceType |
| 1E.1.7 | Update bridge `LOAD_SCHEMA` handler to populate provenance from message metadata | 2 | Bridge messages with provider info populate provenance; messages without it default to `sourceType: 'xsd'` |
| 1E.1.8 | Add Zod schemas for all inbound bridge message types; validate at entry point | 5 | All 6 inbound message types (LOAD_SCHEMA, LOAD_CONFIG, LOAD_REFERENCE_DATA, LOAD_POLICY, LOAD_DOCUMENT_TEMPLATE, SET_ORIGIN_WHITELIST) have Zod schemas; malformed messages are rejected with structured error |

#### DoD Addendum
- Coverage: 95%+ for provider registry; 90%+ for Zod validation
- Zero breaking changes to existing consumers of `SchemaNode`
- Existing saved sessions load correctly (backward compat)

#### Quality Gate
- QG1-QG7 plus:
- **QG-1E.1-A:** All existing engine tests pass unchanged (proves no breaking changes)
- **QG-1E.1-B:** Contract test suite validated by running against XsdSchemaProvider
- **QG-1E.1-C:** Zod validation tested with 25+ malformed message variants

#### Refactor Gate
- Provider interface is in `types/`, not in `engine/parser/`
- Registry follows exact same pattern as `xslt-registry.ts` (auto-register on import)
- Zod schemas are co-located with bridge message types in `bridge/types.ts`
- No business logic in Zod schemas (validate shape only, not semantics)

---

### Epic 1-EVO.2 — Golden Tests & A11y CI Gates

**Duration:** Sprint 2 (Weeks 3-4)
**Refactor Gate Budget:** 1.5 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 1E.2.1 | Create golden test infrastructure: fixture loader, snapshot comparator with diff output, approval workflow | 5 | `npm run test:golden` runs all golden tests; first run creates baselines; subsequent runs compare against baselines; `npm run test:golden:approve` updates baselines |
| 1E.2.2 | Create golden test fixtures: 3 XSD schemas (small/medium/large) with full configurations (selection, columns, style, filters) | 3 | Each fixture includes: XSD file, selection state, column config, style config, filter values, expected outputs (filter XML, XSLT for each format, report definition) |
| 1E.2.3 | Implement golden tests for filter XML generation: 3 fixtures x 1 output = 3 golden files | 2 | Given each fixture, when filter XML is generated, then output matches golden file byte-for-byte |
| 1E.2.4 | Implement golden tests for XSLT generation: 3 fixtures x 4 legacy formats (xlsx, csv, word, html) = 12 golden files | 5 | All 12 golden tests pass; any XSLT change requires explicit approval |
| 1E.2.5 | Implement golden tests for native format XSLT: 3 fixtures x 5 native formats = 15 golden files | 5 | All 15 golden tests pass |
| 1E.2.6 | Implement golden tests for report definition: 3 fixtures = 3 golden files | 2 | All 3 golden tests pass |
| 1E.2.7 | Integrate axe-playwright into Playwright E2E suite: scan every page state visited during E2E tests | 3 | `npm run test:e2e` now includes axe scans; zero critical/serious violations; results included in CI report |
| 1E.2.8 | Add axe-playwright to CI pipeline as a blocking gate | 2 | CI fails if any axe violation is critical or serious; warnings are logged but don't block |
| 1E.2.9 | Create a11y regression test covering all tab states (Design, XSLT, Filter, Report, Package, Templates, Guide) | 3 | 7 tab states scanned; each passes axe audit; keyboard navigation verified per tab |
| 1E.2.10 | Add golden test and a11y status badges to CI pipeline output | 1 | PR checks show golden test status and a11y status as separate checks |

#### DoD Addendum
- 33 golden test files established as baselines
- All existing E2E tests still pass with axe scanning enabled
- CI pipeline adds < 60 seconds from axe scanning

#### Quality Gate
- QG1-QG7 plus:
- **QG-1E.2-A:** Golden tests cover all registered XSLT formats (verify no format is missed)
- **QG-1E.2-B:** A11y scan catches at least 1 real issue (validates the gate is actually checking something)
- **QG-1E.2-C:** Golden test diff output is human-readable (side-by-side, not raw byte dump)

#### Refactor Gate
- Golden test infrastructure is reusable: adding a new fixture requires only adding files to `test/golden-fixtures/`
- Axe config is centralized (not duplicated per test)
- Golden test approval workflow is documented in CONTRIBUTING.md

---

### Phase 1 Technical Debt Review

**Duration:** 1 day

**Focus:** Assess how well the canonical model extension integrates with existing code. Look for:
- Places where code accesses XSD-specific fields that should go through the canonical model
- Bridge message handling that bypasses Zod validation
- Test fixtures that hardcode `sourceType` assumptions

---

## 3. Phase 2 — XML Sample Inference

**Duration:** 4 weeks (2 sprints)
**Goal:** Users can start from an XML sample file instead of an XSD; XFEB infers the schema
**Team:** 2 engineers, 1 QA (part-time)

### Architecture Decision

**ADR-EVO-003: XML Sample Inference Strategy**

Given an XML sample document, XFEB infers a SchemaNode tree by:
1. Parsing the XML DOM
2. Walking all elements, inferring types from content (date patterns, numeric patterns, boolean values, enumerations from repeated values)
3. Inferring cardinality from occurrence counts (elements appearing 0 or 1 times = optional single; elements appearing 2+ times = repeating)
4. Building a SchemaNode tree with `sourceType: 'xml-sample'` and `confidence` scores

**Key constraint:** Inference from a single sample is inherently imprecise. All inferred nodes carry a `confidence` score (0-1). The UI shows confidence indicators and allows the user to review/edit the inferred schema before proceeding.

**Generation pipeline:** Since the source IS XML, the existing XSLT generation pipeline works unchanged. The filter XML and XSLT operate on the same XML structure that was sampled.

---

### Epic 2-EVO.1 — XML Inference Engine

**Duration:** Sprint 3 (Weeks 5-6)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 2E.1.1 | Implement XML sample parser: walk DOM, extract element names, attributes, text content, and occurrence counts | 5 | Given a 50-element XML sample, when parsed, then all elements and attributes are discovered; occurrence counts are accurate |
| 2E.1.2 | Implement type inference engine: detect string, integer, decimal, date, dateTime, time, boolean, duration from content patterns | 8 | Given content "2026-02-16", infers `date`; "42", infers `integer`; "3.14", infers `decimal`; "true"/"false", infers `boolean`; "PT1H30M", infers `duration`; "hello", infers `string`; confidence scores reflect ambiguity |
| 2E.1.3 | Implement enumeration detection: elements with <= 20 distinct values across the sample are marked as potential enumerations | 3 | Given an element with values ["PLANNED", "CONFIRMED", "AIRED"] across 100 occurrences, then `enumerations` is populated; confidence is high (>0.8) because sample size is adequate |
| 2E.1.4 | Implement cardinality inference: single occurrence = `1..1`, zero occurrences in some parents = `0..1`, multiple occurrences = `0..unbounded` | 3 | Given a parent with 10 instances where a child appears 0-5 times, then minOccurs="0", maxOccurs="unbounded" |
| 2E.1.5 | Implement `XmlSampleProvider` conforming to `SchemaProvider` interface | 5 | Provider passes all contract tests; output includes `sourceType: 'xml-sample'` and per-node confidence scores |
| 2E.1.6 | Implement safety limits: max file size (10MB), max depth (30), max elements (10,000), timeout (10s) | 2 | Given a 15MB file, rejected with clear error; given a 10,000-element file, parsed within limits |
| 2E.1.7 | Build inference test suite with 20+ test cases including edge cases (empty elements, mixed content, namespaced elements, CDATA) | 5 | All 20+ tests pass; coverage for inference engine >= 90% |
| 2E.1.8 | Golden tests for XML sample inference: 2 sample XML files with expected inferred SchemaNode trees | 3 | Golden tests pass; inference output is stable across runs |

#### DoD Addendum
- Coverage: 90%+ for inference engine
- Contract tests pass for XmlSampleProvider
- Type inference accuracy: >= 90% on a 500-element test XML with known types

#### Quality Gate
- QG1-QG7 plus:
- **QG-2E.1-A:** Inference tested against 3 real-world WHATS'ON XML exports — produces usable schema trees
- **QG-2E.1-B:** Performance: 1,000-element XML inferred within 2 seconds

#### Refactor Gate
- Type inference is a pure function: `(content: string) => { typeName: string; confidence: number }`
- Inference engine has zero dependencies on DOM (operates on an intermediate representation)
- Confidence calculation is documented and testable (not magic numbers)

---

### Epic 2-EVO.2 — XML Sample UI & Review Flow

**Duration:** Sprint 4 (Weeks 7-8)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 2E.2.1 | Extend SchemaUpload component: add "From XML Sample" option alongside existing XSD upload/paste | 3 | Upload panel shows three options: "Upload XSD", "Paste XSD", "From XML Sample"; XML sample accepts .xml files |
| 2E.2.2 | Implement inference progress UI: parsing indicator, element count progress, "Analysing types..." status | 2 | Given a large XML file, when inference starts, then progress indicator shows; UI remains responsive |
| 2E.2.3 | Implement confidence indicators on tree nodes: color-coded badges (green >= 0.8, amber >= 0.5, red < 0.5) with tooltip showing inference reasoning | 3 | Given an inferred schema, then each node shows a confidence badge; hovering shows "Inferred as date from pattern YYYY-MM-DD (confidence: 0.95)" |
| 2E.2.4 | Implement schema review mode: after inference, show a review panel where users can edit type assignments, adjust cardinality, rename elements, and mark nodes as "confirmed" | 8 | Given an inferred schema, when review mode opens, then user can change a node's type from "string" to "date"; change is reflected in the tree; confirmed nodes show a checkmark |
| 2E.2.5 | Implement "Accept & Continue" action: finalize the inferred schema and proceed to normal selection flow; confirmed overrides persist | 2 | Given a reviewed schema, when accepted, then the tree transitions to normal mode; all confirmed edits are preserved; provenance records user overrides |
| 2E.2.6 | Implement "Re-infer from Different Sample" action: allow uploading an additional XML sample to refine the inferred schema (merge occurrence counts, validate types) | 5 | Given an initial inference from sample A, when sample B is added, then occurrence counts are merged; type conflicts are flagged for review; confidence scores increase where samples agree |
| 2E.2.7 | Update bridge to support `LOAD_XML_SAMPLE` message type | 3 | Given a LOAD_XML_SAMPLE message with XML content, when received, then inference runs and the tree renders; bridge sends READY when inference completes |
| 2E.2.8 | Update golden tests: add 2 XML sample inference fixtures | 2 | Golden tests for XML sample path pass |

#### DoD Addendum
- Coverage: 80%+ for review mode UI
- A11y: confidence badges have text alternatives; review mode is keyboard navigable
- Bridge round-trip: LOAD_XML_SAMPLE -> infer -> edit -> PACKAGE_READY works end-to-end

#### Quality Gate
- QG1-QG7 plus:
- **QG-2E.2-A:** User test: 2 people successfully infer a schema from XML and build a report without prior training
- **QG-2E.2-B:** Multi-sample refinement produces better confidence scores than single-sample (measured on test data)

#### Refactor Gate
- Review mode state is managed in the reducer, not in component-local state
- Confidence display is a reusable component (will be reused for DB inference and recommendations)
- No inference logic in UI components (all in engine/)

---

### Phase 2 Technical Debt Review

**Duration:** 1.5 days

**Expected debt:**
| ID | Item | Type | Severity |
|----|------|------|----------|
| TD-E2.1 | Type inference heuristics may be too aggressive for non-English content (date formats vary by locale) | Design Debt | Medium |
| TD-E2.2 | Multi-sample merge algorithm is O(n*m) where n,m are sample sizes; may need optimization for large samples | Code Debt | Low |
| TD-E2.3 | Review mode adds significant state complexity; review whether it should be a separate reducer | Design Debt | Medium |

---

## 4. Phase 3 — Report Wizard UX

**Duration:** 6 weeks (3 sprints)
**Goal:** Non-technical users can build reports through a guided step-flow wizard
**Team:** 2 engineers, 1 UX designer (part-time), 1 QA (part-time)

### Architecture Decision

**ADR-EVO-004: Wizard as an Alternate Entry Point**

The wizard is NOT a replacement for the existing expert UI. It is an alternate entry point:
- **Expert mode** (existing): Full tree, tabs, manual configuration
- **Wizard mode** (new): Guided step flow that produces the same AppState

Both modes share the same reducer, engine, and generation pipeline. The wizard simply dispatches actions in a guided sequence.

Users can switch from wizard to expert mode at any point (the wizard's progress is in the AppState).

---

### Epic 3-EVO.1 — Wizard Framework & Data Source Step

**Duration:** Sprint 5 (Weeks 9-10)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 3E.1.1 | Implement wizard shell: step indicator (breadcrumb), back/next navigation, progress persistence, cancel/exit to expert mode | 5 | Given the wizard, when navigating between steps, then state is preserved; "Switch to Expert Mode" opens the full UI with current wizard state intact |
| 3E.1.2 | Implement Step 1 "Choose Data Source": card selector for available SchemaProviders; each card shows provider name, description, icon, and availability status | 5 | Given 2 registered providers (XSD, XML Sample), then 2 cards shown; unavailable providers are grayed out with reason; selecting a card advances to Step 2 |
| 3E.1.3 | Implement Step 2 "Load Data": provider-specific upload UI (reuse existing SchemaUpload for XSD, XML Sample uploader for XML) | 3 | Given XSD provider selected, then XSD upload UI shown; given XML Sample selected, then XML upload with inference progress shown |
| 3E.1.4 | Implement smart root detection: after schema loads, automatically identify root entity candidates (elements with the most children, repeating containers) and present them as "Business Objects" | 5 | Given a parsed schema, when root detection runs, then top 3 candidates are ranked; `Programme` in broadcast schema is identified as primary entity |
| 3E.1.5 | Implement Step 3 "Choose Business Object": present detected root candidates as cards with preview of their child fields; user selects one as the rowSource | 3 | Given 3 candidates, when user selects "Programme", then rowSource is set to Programme's XPath; Step 4 is unlocked |
| 3E.1.6 | Implement wizard keyboard navigation: Tab/Shift+Tab between steps, Enter to advance, Escape to go back | 2 | Full wizard flow completable via keyboard only |
| 3E.1.7 | Implement wizard state persistence: save wizard progress to localStorage separately from expert mode | 2 | Given wizard progress to Step 3, when page reloads, then wizard resumes at Step 3 with previous selections |

#### DoD Addendum
- Coverage: 80%+ for wizard shell and steps 1-3
- A11y: wizard passes axe audit; step indicator has aria-current
- Wizard state is serializable and round-trips through localStorage

#### Quality Gate
- QG1-QG7 plus:
- **QG-3E.1-A:** Wizard flow tested with 3 non-technical users — all complete Steps 1-3 without assistance
- **QG-3E.1-B:** Root detection produces sensible candidates for 3 different schema types

#### Refactor Gate
- Wizard step components are independent (no prop drilling between steps)
- Smart detection algorithms are pure functions in engine/ (not in components)
- Wizard dispatches standard AppActions (no wizard-specific reducer)

---

### Epic 3-EVO.2 — Field Selection & Filter Steps

**Duration:** Sprint 6 (Weeks 11-12)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 3E.2.1 | Implement Step 4 "Choose Fields": simplified field picker showing only direct children of selected business object; fields grouped by type (text, date, number, reference); smart defaults pre-select common fields | 5 | Given Programme as business object, then fields like Title, StartDate, EndDate, ChannelCode are pre-selected; user can toggle fields with checkboxes |
| 3E.2.2 | Implement smart default field selection: use field name heuristics (e.g., "Title", "Name", "Date", "Code" are commonly needed) and template patterns to pre-select likely fields | 3 | Given a broadcast schema, then at least 5 fields are pre-selected; pre-selection covers the most commonly exported fields per template usage data |
| 3E.2.3 | Implement "Show More Fields" toggle: expands to show all nested fields (not just direct children) for advanced users | 2 | Given the simplified view, when "Show More" is clicked, then nested fields (e.g., Programme/Credits/Credit/PersonName) become visible |
| 3E.2.4 | Implement Step 5 "Add Filters": show only selected fields that support filtering (based on type); suggest common filter patterns ("Date range for the next 7 days", "Specific channels only") | 5 | Given selected date fields, then "Date range" filter suggestion appears; given enumeration fields, then "Select values" suggestion appears; user can skip this step |
| 3E.2.5 | Implement filter presets: "Next 7 days", "Next 30 days", "This month", "Specific values" as one-click options | 3 | Given a date field, when "Next 7 days" preset is selected, then filter is created with BETWEEN operator and calculated date range |
| 3E.2.6 | Implement Step 6 "Choose Output": format selector with visual previews (thumbnail of each format), style preset selector with live preview | 5 | Given Step 6, then format cards show thumbnails; style presets show color previews; selecting changes the preview table in real-time |
| 3E.2.7 | Implement "Finish" action: transition from wizard to Package tab with all configuration complete; show summary of what was configured | 3 | Given wizard completion, then summary shows: "12 fields from Programme, filtered by date range, Excel format with Corporate style"; "Download" button is prominent |

#### DoD Addendum
- Coverage: 80%+ for wizard Steps 4-6
- Full wizard flow: data source -> business object -> fields -> filters -> output -> download
- Smart defaults produce valid, useful configurations for 3+ schema types

#### Quality Gate
- QG1-QG7 plus:
- **QG-3E.2-A:** End-to-end wizard test: 3 non-technical users complete full flow and download a valid package
- **QG-3E.2-B:** Smart defaults cover >= 70% of fields that users would manually select (measured against template field lists)

#### Refactor Gate
- Filter presets are data-driven (not hardcoded switch statements)
- Smart default heuristics are in engine/ with unit tests
- Step components share no mutable state (communicate only through AppState)

---

### Epic 3-EVO.3 — Template Presets & Onboarding

**Duration:** Sprint 7 (Weeks 13-14)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 3E.3.1 | Create 5 business-use-case template presets: "Daily Schedule Export", "EPG Feed", "Rights Window Report", "Commercial Breaks Summary", "Compliance Audit" | 5 | Each preset includes: display name, description, business context, icon, suggested fields (by name pattern), suggested filters, suggested format and style |
| 3E.3.2 | Implement "Start from Template" option in wizard Step 1: show template presets before data source selection; selecting a preset pre-fills all wizard steps | 3 | Given template presets, when "Daily Schedule Export" is selected, then all steps are pre-filled; user can review and adjust each step before finishing |
| 3E.3.3 | Implement wizard onboarding: first-time tooltip tour highlighting key concepts ("This is where you choose your data", "These fields become columns in your report") | 3 | Given first visit, then onboarding tour starts; each tooltip has dismiss/next/skip all; tour state persisted to localStorage |
| 3E.3.4 | Implement contextual help panels: each wizard step has a collapsible help panel with explanation and examples | 2 | Given Step 4, then help panel explains "Fields are the columns in your report" with a visual example |
| 3E.3.5 | Implement wizard analytics: track step completion rates, drop-off points, time per step, template preset usage | 2 | Given analytics enabled, then wizard events are tracked; summary shows conversion funnel |
| 3E.3.6 | Update golden tests: add 2 wizard-flow fixtures (template preset application + manual wizard completion) | 2 | Golden tests for wizard outputs pass |
| 3E.3.7 | Full E2E test for wizard: complete flow from data source to download in all 3 browsers | 5 | E2E test passes in Chrome, Firefox, Edge |

#### DoD Addendum
- Coverage: 80%+ for wizard components overall
- Template presets produce valid packages when applied to broadcast schema
- Onboarding tour is accessible (keyboard navigable, screen reader compatible)

#### Quality Gate
- QG1-QG7 plus:
- **QG-3E.3-A:** Template presets reviewed by Professional Services for business accuracy
- **QG-3E.3-B:** Wizard onboarding tested with 3 first-time users — all reach download without help

#### Refactor Gate
- Template presets are defined as data (not code) — adding a new preset requires no code changes
- Onboarding state management is decoupled from wizard state
- No wizard-specific business logic in component layer

---

### Phase 3 Technical Debt Review

**Duration:** 2 days

**Expected debt:**
| ID | Item | Type | Severity |
|----|------|------|----------|
| TD-E3.1 | Smart default heuristics are English-centric (field name matching); needs i18n for non-English schemas | Design Debt | Medium |
| TD-E3.2 | Wizard adds a second entry point to the same AppState; state transitions from wizard to expert mode may have edge cases | Design Debt | High |
| TD-E3.3 | 5 template presets may not cover all client use cases; need feedback loop | Product Debt | Medium |
| TD-E3.4 | Onboarding library (if external) adds bundle weight | Dependency Debt | Low |

---

## 5. Phase 4 — Database Ingestion

**Duration:** 8 weeks (4 sprints)
**Goal:** Users can introspect a database schema and build reports from database sources
**Team:** 2 frontend engineers, 1 backend engineer, 1 QA

### Architecture Decision

**ADR-EVO-005: XML Intermediary for Database Sources**

Database sources use an **XML intermediary strategy**:

1. `DatabaseSchemaProvider` introspects the DB and produces a `SchemaNode` tree
2. A server-side component executes the SQL query and produces XML output
3. The existing XSLT generation pipeline transforms this XML

This avoids forking the generation pipeline. The intermediary XML follows a canonical structure:

```xml
<dataset>
  <row>
    <TableName.ColumnName>value</TableName.ColumnName>
    ...
  </row>
</dataset>
```

**Trade-off:** Adds a server component for SQL execution + XML serialization. But this is far simpler than building a parallel CSV/XLSX generation pipeline from SQL result sets.

**ADR-EVO-006: Connection Management**

Database connections are **never managed by the XFEB frontend**. The server-side component (WHATS'ON backend or standalone API) holds connection pools. XFEB sends introspection/query requests via the bridge or REST API.

---

### Epic 4-EVO.1 — Database Schema Introspection

**Duration:** Sprint 8-9 (Weeks 15-18)
**Refactor Gate Budget:** 2.5 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 4E.1.1 | Implement server-side database introspection API: `GET /api/v1/introspect?connection={id}` returning schema metadata (tables, columns, types, constraints, foreign keys, comments) | 8 | Given a Postgres database, when introspected, then response includes all tables, columns with types, nullable flags, PK/FK constraints, and column comments; response time < 5s for a 100-table database |
| 4E.1.2 | Implement `PostgresSchemaProvider`: convert introspection response to `SchemaNode` tree | 8 | Provider passes contract tests; tables become complex nodes; columns become leaf nodes; FK relationships create nested child trees; types map correctly (varchar->string, timestamp->dateTime, integer->integer, boolean->boolean) |
| 4E.1.3 | Implement type mapping: Postgres types -> XSD-compatible type names | 3 | varchar/text->string, integer/bigint->integer, numeric/decimal->decimal, timestamp->dateTime, date->date, boolean->boolean, interval->duration; unmapped types default to string with warning |
| 4E.1.4 | Implement FK-based tree building: foreign keys create parent-child relationships; detect 1:1, 1:N, M:N (via junction tables) | 8 | Given Programme -> Channel (FK), then Channel appears as child of Programme; given Programme <-> Credit (via junction), then Credits appears as repeating child |
| 4E.1.5 | Implement connection selector UI in wizard and expert mode: dropdown of available connections (from API), with connection test button | 3 | Given 3 configured connections, then dropdown lists them; "Test" button verifies connectivity; selected connection is stored in state |
| 4E.1.6 | Implement introspection progress UI: table discovery, column analysis, relationship detection phases | 2 | Given a 50-table database, then progress shows "Discovering tables... (32/50)" |
| 4E.1.7 | Create `DatabaseSchemaProvider` contract tests and golden tests | 5 | Contract tests pass; 2 golden test fixtures (simple schema + complex FK schema) |
| 4E.1.8 | Implement schema preview with table/column descriptions from DB comments | 2 | Given a column with `COMMENT ON COLUMN programme.title IS 'Programme title'`, then node documentation shows "Programme title" |

#### DoD Addendum
- Coverage: 85%+ for DatabaseSchemaProvider
- Tested against Postgres 14, 15, 16
- FK relationship detection accurate for 3 test databases
- Connection credentials never stored in frontend state or localStorage

#### Quality Gate
- QG1-QG7 plus:
- **QG-4E.1-A:** Introspection tested against a real broadcast database (anonymised) with 50+ tables
- **QG-4E.1-B:** Security: connection test verifies that frontend never receives raw connection strings

#### Refactor Gate
- Type mapping is a configuration table, not a switch statement
- FK analysis is a separate, testable module from the tree builder
- No SQL in frontend code (all server-side)

---

### Epic 4-EVO.2 — XML Intermediary & Generation Pipeline

**Duration:** Sprint 10-11 (Weeks 19-22)
**Refactor Gate Budget:** 2.5 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 4E.2.1 | Implement server-side SQL query builder: from SchemaNode selection + filters, generate SQL query that produces the correct dataset | 8 | Given a selection of Programme.Title, Programme.StartDate, Channel.Name with date filter, then generated SQL includes correct JOINs, WHERE clause, and ORDER BY |
| 4E.2.2 | Implement server-side XML serializer: execute SQL, serialize result set as canonical XML | 5 | Given a query returning 100 rows x 5 columns, then XML output conforms to canonical structure; special characters escaped; null values handled as empty elements |
| 4E.2.3 | Implement server-side query execution API: `POST /api/v1/query` with connection ID and query definition; returns XML | 5 | Given a valid query, when executed, then XML is returned; timeout after 30s; max 10,000 rows; errors return structured messages |
| 4E.2.4 | Implement XSLT adaptation for canonical XML: ensure existing generators produce correct output when given canonical XML (rowSource = `/dataset/row`, column XPaths = element names) | 5 | Given canonical XML input, when existing Excel/CSV/Word/HTML XSLT is generated, then output is correct; grouping and sorting work |
| 4E.2.5 | Implement filter XML adaptation: database filters translate to WHERE clauses (server-side), not XML-based filters | 3 | Given filters on a database source, then filter XML contains SQL-compatible filter definitions; server translates to WHERE clause |
| 4E.2.6 | Implement "Preview Data" button: execute query with LIMIT 10 and show results in preview table | 3 | Given a configured database report, when "Preview" is clicked, then 10 rows of real data appear in the preview table within 5 seconds |
| 4E.2.7 | Implement database-source golden tests: 2 fixtures with expected SQL, XML output, and XSLT output | 5 | Golden tests pass for database-source reports |
| 4E.2.8 | Implement error handling: connection failures, query timeouts, permission errors, empty results | 3 | Given a connection failure, then user sees "Database connection unavailable" with retry option; given timeout, then "Query exceeded time limit" with suggestion to add filters |
| 4E.2.9 | Update report definition generator: include data source type and connection metadata in report XML | 2 | Given a database-source report, then report definition includes `<DataSource type="database">` with connection reference |

#### DoD Addendum
- Coverage: 85%+ for XML intermediary and SQL generation
- End-to-end: database schema -> select fields -> configure export -> download package works
- Golden tests cover both XSD and database source types
- No SQL injection vulnerabilities (parameterized queries only)

#### Quality Gate
- QG1-QG7 plus:
- **QG-4E.2-A:** SQL injection test suite: 20+ injection attempts all prevented
- **QG-4E.2-B:** Performance: query + XML serialization < 10s for 10,000 rows
- **QG-4E.2-C:** Existing XSD-path golden tests all still pass (no regression)

#### Refactor Gate
- SQL generation uses parameterized queries exclusively (no string interpolation)
- XML serializer streams output (not building full DOM in memory)
- Server-side code has its own test suite independent of frontend
- No generation pipeline code was forked (intermediary strategy verified)

---

### Phase 4 Technical Debt Review

**Duration:** 2 days

**Expected debt:**
| ID | Item | Type | Severity |
|----|------|------|----------|
| TD-E4.1 | SQL query builder handles only simple JOINs; complex FK paths (3+ hops) may produce incorrect queries | Design Debt | High |
| TD-E4.2 | Only Postgres supported; MySQL/SQL Server need their own type maps and introspection queries | Design Debt | Medium |
| TD-E4.3 | XML intermediary adds latency compared to direct format output; may need caching or streaming | Code Debt | Medium |
| TD-E4.4 | Server-side component deployment story undefined for standalone mode (no WHATS'ON backend) | Design Debt | High |

---

## 6. Phase 5 — Rule-Based Recommendations

**Duration:** 4 weeks (2 sprints)
**Goal:** XFEB suggests fields, filters, and layouts based on rules and heuristics
**Team:** 2 engineers, 1 QA (part-time)

### Architecture Decision

**ADR-EVO-007: Rule-Based, Not AI**

V1 recommendations use deterministic rules, not LLMs:
- Field suggestions based on: type frequency, name patterns, template usage statistics, sibling co-selection patterns
- Filter suggestions based on: type (dates always suggest range), cardinality (enums suggest IN), policy rules
- Layout suggestions based on: column count, data types, template patterns

If rule-based proves insufficient (measured by suggestion acceptance rate < 60%), then LLM-based recommendations are considered in a future phase.

---

### Epic 5-EVO.1 — Recommendation Engine

**Duration:** Sprint 12 (Weeks 23-24)
**Refactor Gate Budget:** 1.5 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 5E.1.1 | Implement field recommendation engine: given a root entity and schema, suggest fields based on name-pattern heuristics, type distribution, and co-selection patterns from template data | 8 | Given "Programme" as root, then Title, StartDate, EndDate, Duration, ChannelCode are suggested; each suggestion has a reason string ("commonly exported field", "date fields usually needed for scheduling") |
| 5E.1.2 | Implement filter recommendation engine: given selected fields, suggest appropriate filters based on type and domain patterns | 5 | Given a date field, then "date range" filter suggested; given an enum/reference field, then "value selection" filter suggested; given a high-cardinality repeating element, then "limit" filter suggested |
| 5E.1.3 | Implement layout recommendation engine: given selected fields and count, suggest format, column order, grouping, and style | 5 | Given 5 date/text fields, then suggest table format; given 20+ fields, then suggest grouped layout; given time-series data, then suggest sorting by date |
| 5E.1.4 | Implement `Recommendation` type: suggestion text, reason, confidence (0-1), target action (what it would do if accepted), category (field, filter, layout) | 2 | Type is defined; all recommendation engines return `Recommendation[]` |
| 5E.1.5 | Implement recommendation acceptance tracking: when user accepts/rejects suggestions, record for future pattern improvement | 3 | Given a suggestion accepted, then acceptance event recorded; given rejected, then rejection recorded with context |
| 5E.1.6 | Build recommendation test suite: 15+ test cases covering field, filter, and layout suggestions | 3 | All tests pass; coverage >= 85% for recommendation engine |

#### DoD Addendum
- Coverage: 85%+ for recommendation engine
- Recommendations produce valid AppState changes when accepted
- No recommendation produces an invalid configuration

#### Quality Gate
- QG1-QG7 plus:
- **QG-5E.1-A:** Field suggestions match >= 70% of fields in standard templates
- **QG-5E.1-B:** Recommendation confidence scores correlate with acceptance rates in testing

#### Refactor Gate
- All recommendation logic is pure functions in engine/
- Recommendations are data (not imperative actions); UI decides how to present them
- Co-selection patterns are loaded from a data file, not hardcoded

---

### Epic 5-EVO.2 — Recommendation UI

**Duration:** Sprint 13 (Weeks 25-26)
**Refactor Gate Budget:** 1.5 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 5E.2.1 | Implement recommendation panel: collapsible sidebar in expert mode showing current suggestions grouped by category | 5 | Given active recommendations, then panel shows "3 field suggestions, 2 filter suggestions, 1 layout suggestion"; each expandable to show details |
| 5E.2.2 | Implement "Explain Why" panel: click a recommendation to see detailed reasoning ("Included because Programme.Title is the primary identifier field, selected in 95% of templates") | 3 | Given a recommendation, when "Why?" is clicked, then explanation panel shows reasoning, confidence bar, and source pattern |
| 5E.2.3 | Implement "Accept" / "Dismiss" actions on each recommendation | 2 | Given a recommendation, when "Accept" is clicked, then the suggested action is dispatched; when "Dismiss" is clicked, then recommendation is hidden and dismissal recorded |
| 5E.2.4 | Implement "Accept All" for a category: apply all field suggestions, or all filter suggestions at once | 2 | Given 5 field suggestions, when "Accept All Fields" is clicked, then all 5 are selected at once |
| 5E.2.5 | Integrate recommendations into wizard: show suggestions inline in relevant wizard steps (Step 4: field suggestions, Step 5: filter suggestions, Step 6: layout suggestions) | 5 | Given wizard Step 4, then field suggestions appear as highlighted pre-selections with "Suggested" badge; user can deselect |
| 5E.2.6 | Implement recommendation refresh: when schema, selection, or filters change, recommendations update | 3 | Given a selection change, then recommendations recalculate within 200ms; new suggestions appear; accepted suggestions that are still valid remain |
| 5E.2.7 | A11y for recommendation panel: keyboard navigation, screen reader support, focus management | 2 | Panel is fully keyboard navigable; recommendations announced by screen reader |
| 5E.2.8 | Implement "Describe Your Report" text input: parse natural language description into recommendation weights (rule-based keyword extraction, NOT LLM) | 5 | Given "daily schedule with programme times for VTM", then "schedule" boosts date/time field suggestions; "VTM" suggests channel filter; results improve field suggestions |

#### DoD Addendum
- Coverage: 80%+ for recommendation UI
- A11y: panel passes axe audit
- Natural language input handles 20+ tested descriptions

#### Quality Gate
- QG1-QG7 plus:
- **QG-5E.2-A:** User test: 5 users rate recommendation helpfulness >= 3.5/5
- **QG-5E.2-B:** Natural language input produces relevant suggestions for 15+ test descriptions

#### Refactor Gate
- Recommendation panel is a self-contained feature (can be disabled via feature flag without affecting any other component)
- Natural language parsing does NOT use external services (fully client-side)
- No recommendation code in core selection/generation/filter paths (recommendations are advisory only)

---

### Phase 5 Technical Debt Review

**Duration:** 1.5 days

**Expected debt:**
| ID | Item | Type | Severity |
|----|------|------|----------|
| TD-E5.1 | Co-selection pattern data is static; needs a pipeline to update from real usage data | Design Debt | Medium |
| TD-E5.2 | Natural language parsing is keyword-based; may need NLP library for better accuracy | Design Debt | Low |
| TD-E5.3 | Recommendation refresh on every state change may cause performance issues with large schemas | Code Debt | Medium |

---

## 7. Phase 6 — Enterprise Readiness

**Duration:** 4 weeks (2 sprints)
**Goal:** Versioned specs, audit logging, policy defaults, operational governance
**Team:** 2 engineers, 1 QA, 1 ops engineer (part-time)

---

### Epic 6-EVO.1 — Versioning & Audit

**Duration:** Sprint 14 (Weeks 27-28)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 6E.1.1 | Implement mapping spec versioning: every saved configuration has a version tuple `{sourceSchemaVersion, configVersion, appVersion}` | 3 | Given a saved config, then it includes all three version fields; loading detects version mismatches |
| 6E.1.2 | Implement source schema change detection: when a schema changes (new columns, removed tables, type changes), detect and report impact on existing configurations | 8 | Given schema v2 with a removed column used in a saved config, then impact report shows "Column Programme.OldField removed — used in 2 column definitions and 1 filter" |
| 6E.1.3 | Implement configuration migration engine: given a config created against schema v1 and schema v2, produce a migration plan (auto-fix renames, flag removals, suggest alternatives for type changes) | 8 | Given a renamed column (Title -> ProgrammeTitle), when migration runs, then auto-fix updates XPath references; given a removed column, then migration flags it for user review |
| 6E.1.4 | Implement audit log: record all significant actions (schema load, config save, template apply, package download, config import, config export) with timestamp, user identity (if available), and action details | 5 | Given 10 actions, then audit log contains 10 entries; each entry includes timestamp, action type, user, and details (e.g., "Saved config 'Daily Schedule v3'") |
| 6E.1.5 | Implement audit log viewer: filterable, sortable list of audit entries; export to CSV | 3 | Given 50 audit entries, then viewer shows paginated list; filter by action type works; CSV export produces valid file |
| 6E.1.6 | Implement audit log storage: in-memory for standalone, API-backed for embedded mode | 3 | Standalone: log persists to localStorage (max 500 entries, FIFO); embedded: log posted to API endpoint |

#### DoD Addendum
- Coverage: 85%+ for versioning and migration engine
- Audit log captures all significant actions without impacting performance
- Migration engine handles 10+ schema change scenarios correctly

#### Quality Gate
- QG1-QG7 plus:
- **QG-6E.1-A:** Schema migration tested with 3 real schema version transitions
- **QG-6E.1-B:** Audit log entries are never lost (verified with stress test: 100 rapid actions)

#### Refactor Gate
- Audit log is a pure side-effect module (no business logic depends on it)
- Migration engine is reversible (can undo a migration)
- Version comparison is semantic, not string-based

---

### Epic 6-EVO.2 — Policy Defaults & Operational Controls

**Duration:** Sprint 15 (Weeks 29-30)
**Refactor Gate Budget:** 2 days

#### Stories

| ID | Story | Pts | Acceptance Criteria |
|----|-------|-----|-------------------|
| 6E.2.1 | Implement policy preset library: built-in policy configurations for common scenarios ("Production Safe", "Development Unrestricted", "Compliance Required") | 3 | Given 3 presets, then each can be applied as the default policy; "Production Safe" includes MAX_DATE_RANGE_DAYS=31, MAX_ESTIMATED_ROWS=50000, REQUIRED_FILTER on date fields |
| 6E.2.2 | Implement admin-configurable policy defaults: via bridge message or config file, set organization-wide default policies | 5 | Given a policy config pushed via bridge, then all new configurations start with those policies; existing configs are flagged if they violate new policies |
| 6E.2.3 | Implement cost estimation warnings: before download, estimate server resource cost (query time, data volume) and warn if exceeding thresholds | 5 | Given a report selecting 50 fields with no filters, then warning shows "Estimated: 500K rows, ~2GB XML, ~45s query time — consider adding filters" |
| 6E.2.4 | Implement rate limiting metadata: package includes execution cost hints that the server can use for scheduling | 2 | Given a report definition, then execution hints include estimated row count, column count, and filter complexity score |
| 6E.2.5 | Implement configuration approval workflow: flag configurations that exceed cost thresholds for admin approval before they can be scheduled | 5 | Given a high-cost report, then package includes `requiresApproval: true`; bridge sends `APPROVAL_REQUIRED` message to host |
| 6E.2.6 | Update bridge protocol: add `LOAD_POLICY_PRESET`, `APPROVAL_REQUIRED`, `APPROVAL_GRANTED` message types | 3 | Given new message types, then Zod schemas are defined; bridge handles all new messages correctly |
| 6E.2.7 | End-to-end governance test: policy preset -> config creation -> cost estimation -> approval flow -> package delivery | 5 | E2E test passes; all governance controls function correctly in sequence |

#### DoD Addendum
- Coverage: 85%+ for policy presets and cost estimation
- Cost estimation within 2x of actual execution cost (validated against test data)
- Approval workflow works in both standalone (manual confirmation) and embedded (bridge) modes

#### Quality Gate
- QG1-QG7 plus:
- **QG-6E.2-A:** Policy presets reviewed by operations team for real-world applicability
- **QG-6E.2-B:** Cost estimation validated against 5 real report execution metrics

#### Refactor Gate
- Policy preset definitions are data files (JSON/YAML), not code
- Cost estimation is a pure function taking schema + selection + filters
- Approval workflow is opt-in (disabled by default, activated by policy)

---

### Phase 6 Technical Debt Review (Final Evolution Review)

**Duration:** 2 days

**Focus areas:**
| ID | Review Area | Action |
|----|-------------|--------|
| TD-E6.1 | Provider architecture review — do all 3 providers (XSD, XML Sample, Database) conform cleanly to the interface? | Architecture audit |
| TD-E6.2 | Golden test completeness — are all source types, formats, and edge cases covered? | Coverage analysis |
| TD-E6.3 | Bundle size impact of evolution features — measure impact of wizard, recommendations, governance | Bundle analysis |
| TD-E6.4 | Documentation completeness — API reference, provider authoring guide, governance admin guide | Doc review |
| TD-E6.5 | Feature flag cleanup — any evolution features still behind flags that should be enabled by default? | Flag audit |

**Output:**
- Evolution Architecture Review document
- Updated Maintenance Runbook (add: how to create a new SchemaProvider, how to add recommendation rules, how to create policy presets)
- Remaining debt items prioritised for post-evolution maintenance

---

## 8. Summary Timeline

```
Phase 1: Foundation Hardening                          [Weeks 1-4]
  ├── Epic 1-EVO.1: Canonical Model & Providers        ██████
  ├── Epic 1-EVO.2: Golden Tests & A11y CI             ██████
  └── Phase 1 Debt Review                              █

Phase 2: XML Sample Inference                          [Weeks 5-8]
  ├── Epic 2-EVO.1: Inference Engine                   ██████
  ├── Epic 2-EVO.2: Inference UI & Review              ██████
  └── Phase 2 Debt Review                              █

Phase 3: Report Wizard UX                              [Weeks 9-14]
  ├── Epic 3-EVO.1: Wizard Framework & Data Source     ██████
  ├── Epic 3-EVO.2: Field Selection & Filters          ██████
  ├── Epic 3-EVO.3: Template Presets & Onboarding      ██████
  └── Phase 3 Debt Review                              ██

Phase 4: Database Ingestion                            [Weeks 15-22]
  ├── Epic 4-EVO.1: DB Schema Introspection            ████████████
  ├── Epic 4-EVO.2: XML Intermediary & Pipeline        ████████████
  └── Phase 4 Debt Review                              ██

Phase 5: Rule-Based Recommendations                    [Weeks 23-26]
  ├── Epic 5-EVO.1: Recommendation Engine              ██████
  ├── Epic 5-EVO.2: Recommendation UI                  ██████
  └── Phase 5 Debt Review                              █

Phase 6: Enterprise Readiness                          [Weeks 27-30]
  ├── Epic 6-EVO.1: Versioning & Audit                 ██████
  ├── Epic 6-EVO.2: Policy Defaults & Controls         ██████
  └── Phase 6 Debt Review (Final)                      ██
```

**Total duration:** 30 weeks (~7.5 months)
**Prerequisite:** XFEB Phases 1-2 complete (16-24 weeks prior work)

---

## 9. Dependency Map

```
Phase 1 (Foundation)
  │
  ├──> Phase 2 (XML Inference) ──> requires SchemaProvider interface
  │
  ├──> Phase 3 (Wizard) ──────────> requires golden tests, provider registry
  │       │
  │       └──> Phase 5 (Recommendations) ──> requires wizard steps to integrate into
  │
  ├──> Phase 4 (Database) ────────> requires SchemaProvider, golden tests, a11y gates
  │
  └──> Phase 6 (Enterprise) ──────> requires all providers operational, policy engine

  Mapping Studio (separate subproject)
    └──> requires Phase 4 complete (database schema trees exist)
    └──> can start Phase MS.1 in parallel with Phase 5
```

---

## 10. Risk Register

| ID | Risk | Impact | Likelihood | Mitigation |
|----|------|--------|-----------|------------|
| RE-1 | XML type inference accuracy too low for production use | High | Medium | Multi-sample refinement, user review mode, confidence thresholds |
| RE-2 | Database FK analysis produces incorrect tree structures for complex schemas | High | Medium | Manual relationship editing UI, golden tests against real DBs |
| RE-3 | Wizard over-simplifies, frustrating power users | Medium | Low | Expert mode always available, wizard state transfers cleanly |
| RE-4 | XML intermediary latency unacceptable for large database reports | High | Medium | Streaming XML serialization, query result caching, pagination |
| RE-5 | Recommendation acceptance rate too low (< 50%) | Medium | Medium | Track acceptance, iterate on rules, consider LLM fallback in future |
| RE-6 | Evolution features bloat bundle size beyond budget | Medium | Low | Feature-level code splitting, lazy loading for wizard/recommendations |
| RE-7 | Backward compatibility breaks for existing WHATS'ON integrations | High | Low | Comprehensive golden tests, bridge version negotiation |

---

## 11. Success Metrics

| Metric | Target | Measured By |
|--------|--------|-------------|
| Schema source diversity | >= 2 source types in active use within 6 months | Analytics |
| Wizard completion rate | >= 70% of wizard starts reach download | Analytics funnel |
| Time to first report (wizard) | < 10 minutes for non-technical user | User testing |
| Time to first report (expert) | < 5 minutes for technical user | User testing |
| Recommendation acceptance rate | >= 60% of shown suggestions accepted | Analytics |
| Golden test stability | Zero unintended regressions per release | CI metrics |
| A11y violations | Zero critical/serious per release | CI metrics |
| Schema inference accuracy | >= 90% type accuracy on test corpus | Automated testing |
| Bundle size | < 250KB gzipped (total, with code splitting) | Build metrics |
