# XFEB Development Plan

**XML Filter & Export Builder — Detailed Development Plan**
**Reference:** MGX-XFEB-SD-2026-001 | **Prototype:** filter-export-builder-v2.jsx
**Date:** 15 February 2026

---

## 1. Governance Framework

### 1.1 Definition of Ready (DoR)

A work item (story, task, spike) is Ready when **all** of the following are satisfied:

| # | Criterion | Verification |
|---|-----------|-------------|
| R1 | **User story** follows the template: _As a [persona], I want [action] so that [outcome]_ — or for technical tasks: _In order to [goal], the system must [behaviour]_ | Scrum Master checks during backlog refinement |
| R2 | **Acceptance criteria** are written as testable Given/When/Then statements; minimum 2, maximum 8 per story | Product Owner signs off |
| R3 | **Dependencies** are identified; all blocking items are either resolved or have a confirmed delivery date that precedes the sprint start | Dependency matrix reviewed in refinement |
| R4 | **Design artefacts** are attached: UX wireframes or annotated screenshots for UI stories; API contract or data model for backend/engine stories; architecture decision record (ADR) for structural changes | Tech Lead confirms |
| R5 | **Estimate** is agreed by the team (story points or t-shirt sizing); any item larger than 8 points is split | Team consensus in planning |
| R6 | **Test approach** is documented: which test levels apply (unit, component, integration, E2E, visual regression), expected test count, and any test data requirements | QA Lead reviews |
| R7 | **No open questions** remain; all clarifications from Product Owner or Technical Architect are resolved and captured in the story description | Refinement sign-off |
| R8 | **Accessibility impact** is assessed: stories touching UI must note ARIA roles, keyboard interactions, and contrast requirements that apply | UX/Accessibility reviewer confirms |

**Gate rule:** A story that fails any DoR criterion is returned to the backlog. The Scrum Master is responsible for enforcing this gate at sprint planning.

---

### 1.2 Definition of Done (DoD)

A work item is Done when **all** of the following are satisfied:

| # | Criterion | Evidence |
|---|-----------|----------|
| D1 | **Code is written** in TypeScript (strict mode, no `any` escapes unless documented in ADR) | CI type-check passes |
| D2 | **Peer review completed** — at least one approving review from a team member who did not author the code; all review comments resolved or deferred with linked ticket | PR approval in version control |
| D3 | **Unit tests pass** — new/modified functions have tests; coverage for the touched module does not decrease below its epic target (see per-epic DoD addenda) | CI coverage report |
| D4 | **Component tests pass** (UI stories only) — React Testing Library tests exercise user interactions described in acceptance criteria | CI test suite |
| D5 | **Integration tests pass** — cross-module workflows affected by the change are covered | CI test suite |
| D6 | **Lint and format clean** — zero ESLint errors, zero Prettier violations, zero TypeScript errors | CI lint step |
| D7 | **No known regressions** — full test suite green; any pre-existing failures are documented and unrelated to the change | CI pipeline status |
| D8 | **Accessibility verified** (UI stories) — manual keyboard walkthrough of the new/changed UI; axe-core scan with zero critical/serious violations | Accessibility checklist in PR template |
| D9 | **Performance budget respected** — if the story touches a performance-critical path (see Section 11 of Solution Design), a benchmark measurement is included in the PR description | PR description |
| D10 | **Documentation updated** — JSDoc on all exported functions; README or guide updated if user-facing behaviour changed; changelog entry added | PR diff includes doc changes |
| D11 | **Deployed to staging** and smoke-tested by the author | Staging deployment log |
| D12 | **Product Owner acceptance** — PO has reviewed the feature on staging against the acceptance criteria and confirmed Done | PO sign-off comment on ticket |

**Gate rule:** A story that fails any DoD criterion is not counted toward sprint velocity and remains In Progress. Incomplete stories are the first item in the next sprint's planning.

---

### 1.3 Quality Gate Process

Quality Gates are formal checkpoints at the end of each Epic. An Epic cannot be closed and subsequent work cannot begin on dependent Epics until the gate passes.

**Quality Gate checklist:**

| # | Gate Criterion | Measured By |
|---|---------------|-------------|
| QG1 | All stories in the Epic meet DoD | Scrum Master audit |
| QG2 | Epic-level coverage target met (defined per-epic below) | CI coverage report scoped to epic modules |
| QG3 | Zero critical or high-severity bugs open against the Epic | Bug tracker query |
| QG4 | Performance benchmarks meet targets for all touched operations | Benchmark suite output |
| QG5 | Accessibility scan passes for all new UI (zero critical/serious axe-core violations) | Automated + manual audit report |
| QG6 | All Epic acceptance criteria (defined per-epic below) are demonstrated | Sprint Review demo recording |
| QG7 | Technical debt items discovered during the Epic are logged in the Tech Debt Register with severity, effort estimate, and proposed resolution phase | Tech Debt Register review |

**Approval:** Quality Gate requires sign-off from the Tech Lead, QA Lead, and Product Owner. Conditional pass is allowed with a maximum of 2 medium-severity open items, each with a committed remediation sprint.

---

### 1.4 Refactor Gate Process

A Refactor Gate follows each Epic's Quality Gate. Its purpose is to prevent accumulated code entropy from carrying into subsequent Epics. The Refactor Gate allocates dedicated capacity (see per-epic budgets below) and requires explicit sign-off before proceeding.

**Refactor Gate checklist:**

| # | Gate Criterion | Measured By |
|---|---------------|-------------|
| RG1 | **Static analysis scores stable or improved** — cyclomatic complexity per function ≤ 15; cognitive complexity per function ≤ 20; no module exceeds 400 lines | SonarQube / ESLint complexity rules |
| RG2 | **Dependency audit clean** — `npm audit` shows zero high/critical vulnerabilities; no unused dependencies in package.json | CI audit step |
| RG3 | **Module boundaries respected** — no circular imports; engine modules (parser, selection, generation) have zero direct imports from presentation layer | Dependency graph tool (madge or similar) |
| RG4 | **Test quality reviewed** — no skipped tests (`.skip`); no tests that only assert `toBeTruthy()` without meaningful checks; snapshot tests have review annotations | Manual test audit |
| RG5 | **API surface reviewed** — exported functions and types are intentional; no accidental exports; public API has JSDoc with @param, @returns, and @example | API surface diff against previous Epic |
| RG6 | **TODO/FIXME/HACK sweep** — all inline comments of this type are either resolved or converted to backlog tickets with linked references | Grep audit |
| RG7 | **Naming and convention consistency** — component naming, file structure, and code patterns follow the established conventions document | Manual code walkthrough |

**Budget:** Each Refactor Gate has a time budget specified per-epic (typically 2-3 days). If the budget is insufficient, remaining items are added to the Tech Debt Register with priority flags.

**Approval:** Tech Lead sign-off required. If RG1 or RG3 fail, the gate blocks until resolved (no conditional pass).

---

### 1.5 Technical Debt Review Process

A Technical Debt Review is conducted at the end of each Phase. It is a formal engineering review, not a retrospective — it produces a concrete remediation plan.

**Process:**

1. **Collect** — Aggregate all Tech Debt Register entries from the phase, plus new items from:
   - Static analysis trends (complexity creep, coverage decline)
   - Runtime profiling (any operation exceeding 2× its performance budget)
   - Dependency age analysis (any dependency more than 2 major versions behind)
   - Architecture conformance check (any module violating its layer boundaries)

2. **Classify** — Each item is classified:
   - **Severity:** Critical (blocks feature work or causes defects) / High (degrades maintainability) / Medium (code smell, not urgent) / Low (cosmetic)
   - **Type:** Design Debt / Code Debt / Test Debt / Dependency Debt / Documentation Debt
   - **Cost of Delay:** What happens if this is not addressed before the next phase?

3. **Prioritise** — Items are ranked using a Weighted Shortest Job First (WSJF) approach: `priority = (severity × cost_of_delay) / effort`

4. **Plan** — Top-priority items are scheduled into a dedicated Tech Debt Sprint at the start of the next phase. Remaining items are carried forward with revised priority.

5. **Report** — A Technical Debt Report is produced containing: summary statistics, trend analysis (is debt growing or shrinking?), the remediation plan, and any architectural recommendations.

**Approval:** Technical Architect and Engineering Manager sign off on the remediation plan before the next phase begins.

---

## 2. Phase 1 — Production Standalone

**Duration:** 10 weeks (extended from original 8; accounts for XSD parser gap, accessibility requirements, and refactor gates)
**Goal:** Feature-complete standalone web application deployable without WHATS'ON changes
**Team:** 2 frontend engineers, 1 QA engineer, 1 UX designer (part-time)

---

### Epic 1.1 — Project Foundation & Infrastructure

**Duration:** Sprint 1 (Weeks 1–2)
**Refactor Gate Budget:** 1 day (lightweight — establishing conventions, not refactoring)

#### Objective
Establish the production project with TypeScript, React 18+, Vite, automated CI pipeline, and design system foundations. Migrate the prototype's structural patterns into a clean modular architecture without yet migrating all functionality.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 1.1.1 | Initialise TypeScript project with Vite, strict tsconfig, and module aliases | 3 | Given a fresh clone, when `npm install && npm run build` is run, then the project compiles with zero errors and produces a production bundle under 200KB gzipped |
| 1.1.2 | Configure ESLint (with complexity rules), Prettier, and Husky pre-commit hooks | 2 | Given a file with a function of cyclomatic complexity > 15, when the developer commits, then the pre-commit hook rejects the commit with a clear error message |
| 1.1.3 | Set up Vitest with coverage reporting, React Testing Library, and CI pipeline (GitHub Actions or equivalent) | 3 | Given a push to any branch, when CI runs, then unit tests execute, coverage report is generated, and the pipeline fails if coverage for any new module is below 80% |
| 1.1.4 | Set up Playwright for E2E testing with cross-browser matrix (Chrome, Firefox, Edge) | 3 | Given the Playwright config, when `npm run test:e2e` runs, then a sample smoke test loads the app and verifies the header renders in all three browsers |
| 1.1.5 | Define design tokens (colours, spacing, typography, radii, shadows) and component primitives (Button, Input, Select, Checkbox) using CSS Modules | 5 | Given the design token file, when a component imports a token, then the value matches the design specification; all primitives render correctly and pass axe-core scan |
| 1.1.6 | Define module architecture: create directory structure for `engine/parser`, `engine/selection`, `engine/analysis`, `engine/generation`, `components/`, `types/`, `utils/` | 2 | Given the directory structure, when checked with madge, then zero circular dependencies exist; each engine module exports a typed public API via an index.ts barrel file |
| 1.1.7 | Create shared TypeScript type definitions: `SchemaNode`, `SelectionState`, `ColumnDefinition`, `StyleConfig`, `ReportMetadata`, `ExportFormat` | 3 | Given the type definitions, when used across modules, then all prototype data shapes are representable without `any` escapes |
| 1.1.8 | Migrate `escXml` utility and add `escXPath` validation utility for XPath expression sanitisation | 2 | Given a string containing `& < > " '` and XPath special characters, when passed through the utilities, then all characters are correctly escaped; fuzz test with 100 random strings passes |

#### Epic-Level Acceptance Criteria
- Clean project builds and deploys to staging with a placeholder UI
- CI pipeline runs lint, type-check, unit tests, and E2E smoke test on every push
- All type definitions compile and are importable from every module
- Pre-commit hooks enforce lint and format rules

#### DoD Addendum for Epic 1.1
- Coverage target: 90%+ for `utils/` module; N/A for UI primitives (tested via component tests in later epics)
- No exceptions to strict TypeScript — establish the zero-`any` convention from day one

#### Quality Gate 1.1
Standard QG1–QG7 plus:
- **QG-1.1-A:** Architecture diagram reviewed and approved by Technical Architect
- **QG-1.1-B:** Design tokens reviewed and approved by UX designer

#### Refactor Gate 1.1
- Verify all naming conventions are documented in a `CONVENTIONS.md`
- Verify module boundaries with dependency graph — sign off on the intended dependency direction (engine → types ← components, never engine → components)

---

### Epic 1.2 — Schema Engine (Production)

**Duration:** Sprint 2–3 (Weeks 3–6) — extended from original 2 weeks due to XSD parser complexity gap
**Refactor Gate Budget:** 2 days

#### Objective
Build the production XSD parser that handles real-world WHATS'ON schemas: named complex types with type= references, element ref= references, xs:attribute parsing, xs:choice/xs:all differentiation, xs:import/xs:include multi-file resolution, and enumeration extraction. This is the highest-risk technical component.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 1.2.1 | Implement core XSD parser: element extraction with name, type, minOccurs, maxOccurs, and inline complex type recursion (parity with prototype) | 5 | Given the demo broadcast XSD, when parsed, then the output tree matches the prototype's tree structure exactly; all 80+ nodes are present with correct types and cardinality |
| 1.2.2 | Implement named complex type resolution: build a type lookup table from top-level `xs:complexType[@name]` and `xs:simpleType[@name]` definitions; resolve `type=` references on elements | 8 | Given an XSD with named types referenced via `type="tns:ChannelType"`, when parsed, then the element's children are populated from the named type definition; type lookup handles namespace prefixes |
| 1.2.3 | Implement element `ref=` resolution: follow `ref=` attributes to the target element definition | 5 | Given an XSD using `<xs:element ref="tns:CommonHeader"/>`, when parsed, then the reference is resolved to the target element with all its children and attributes intact |
| 1.2.4 | Implement `xs:attribute` parsing: attributes appear as leaf nodes with `@` prefix, marked as required/optional | 5 | Given an element with `<xs:attribute name="id" type="xs:string" use="required"/>`, when parsed, then the tree contains a child node named `@id` with type `string`, minOccurs `1` |
| 1.2.5 | Differentiate `xs:choice` vs `xs:sequence` vs `xs:all` in the tree model: add a `compositionType` field to `SchemaNode` | 3 | Given an XSD with a `xs:choice` containing three elements, when parsed, then the parent node's `compositionType` is `"choice"` and UI can distinguish it from sequence |
| 1.2.6 | Implement enumeration extraction from `xs:simpleType/xs:restriction/xs:enumeration` | 3 | Given a type with enumerations (e.g., SlotStatus: PLANNED, CONFIRMED, AIRED, CANCELLED), when parsed, then the node's `enumerations` field contains `["PLANNED", "CONFIRMED", "AIRED", "CANCELLED"]` |
| 1.2.7 | Implement `xs:import` and `xs:include` multi-file schema resolution | 8 | Given a primary XSD that imports a secondary XSD via `xs:import`, when both files are provided to the parser, then cross-file type and element references resolve correctly |
| 1.2.8 | Implement parser safety: depth limit (20 levels), node count limit (5,000), circular reference detection, and parse timeout (5 seconds) | 3 | Given an XSD with a circular type reference, when parsed, then the parser terminates without hanging and returns a structured error indicating the cycle location |
| 1.2.9 | Implement graceful degradation: partial parse results with error markers on unparseable subtrees | 5 | Given an XSD where one subtree uses unsupported xs:group constructs, when parsed, then the valid portions render correctly and the unparseable node shows an error badge with the reason |
| 1.2.10 | Build parser test suite with 40+ test cases covering all supported constructs, edge cases, and 3+ real-world broadcast XSD schemas | 5 | Given the test suite, when run, then all 40+ tests pass; coverage for `engine/parser/` is ≥ 95% |
| 1.2.11 | Performance benchmark: parse 100-element, 500-element, and 1000-element schemas within budget (50ms, 200ms, 500ms) | 2 | Given schemas of each size, when benchmarked, then all three complete within their target time |

#### Epic-Level Acceptance Criteria
- Parser handles the demo broadcast XSD identically to prototype
- Parser handles at least 3 real-world WHATS'ON export XSD schemas without errors
- All parser outputs conform to the `SchemaNode` TypeScript interface
- Graceful degradation produces usable partial trees, not crashes

#### DoD Addendum for Epic 1.2
- Coverage target: 95%+ for `engine/parser/`
- Every XSD construct in the support table has at least 2 test cases (happy path + edge case)
- Performance benchmarks are automated and run in CI

#### Quality Gate 1.2
Standard QG1–QG7 plus:
- **QG-1.2-A:** Parser tested against 3 real client XSD schemas (anonymised if necessary) — all parse successfully or degrade gracefully
- **QG-1.2-B:** Parser security measures verified: XML bomb test, deep recursion test, and circular reference test all terminate safely

#### Refactor Gate 1.2
- Parser module must have no function exceeding 50 lines (the prototype's `parseEl` function conflates extraction, recursion, and type resolution — this must be separated)
- Type lookup table is an independent, testable module, not inlined in the parser walker
- All DOMParser usage is isolated behind an abstraction (enables future replacement with a streaming parser for very large schemas)

---

### Epic 1.3 — Selection Engine & Analysis

**Duration:** Sprint 4 (Weeks 7–8)
**Refactor Gate Budget:** 1.5 days

#### Objective
Build the production selection engine with tri-state checkbox logic, cascading selection, undo/redo, session persistence, and the payload analysis system with repeating-element explosion warnings.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 1.3.1 | Implement selection state management with immutable updates and tri-state computation (checked/partial/unchecked) | 5 | Given a tree with 5 levels, when a mid-level node is checked, then all descendants become checked, all ancestors become checked or partial, and the state is immutable (previous state preserved for undo) |
| 1.3.2 | Implement cascading uncheck: unchecking a parent unchecks all descendants; unchecking the last child of a parent unchecks the parent | 3 | Given a parent with 3 children all checked, when the last child is unchecked, then the parent transitions from partial to unchecked |
| 1.3.3 | Implement undo/redo stack (Ctrl+Z / Ctrl+Shift+Z) with a 50-step history limit | 3 | Given 10 selection changes, when Ctrl+Z is pressed 5 times, then the selection state reverts to the 5th-most-recent state; Ctrl+Shift+Z re-applies |
| 1.3.4 | Implement selection persistence to localStorage with debounced saves (500ms) and session recovery on page load | 3 | Given a selection, when the page is closed and reopened, then the previous selection is restored; given a corrupted localStorage entry, then the app starts with empty selection and logs a warning |
| 1.3.5 | Implement payload estimation engine with configurable per-type weights and per-element multiplier overrides | 5 | Given a schema with configurable multipliers, when the user overrides the `Slot` multiplier from 50 to 200, then the payload estimate recalculates and the reduction percentage updates accordingly |
| 1.3.6 | Implement repeating-element explosion detection: warn when selecting an unbounded element would contribute > 40% of total estimated payload | 3 | Given selection of `Credits/Credit` (unbounded, nested inside unbounded `Slot`), when selected, then a contextual warning appears showing the estimated payload contribution |
| 1.3.7 | Implement schema search: type-ahead search across element names and documentation text with result highlighting and navigation | 5 | Given a schema with 80+ elements, when the user types "right" in the search box, then `Rights`, `RightsWindow`, and any elements with "right" in documentation are highlighted; pressing Enter navigates to the first match |
| 1.3.8 | Implement filter completeness validation: detect required elements (minOccurs > 0) that are ancestors of selected elements but are not themselves selected | 3 | Given a required parent element and a selected child, when the filter is generated, then a validation warning appears if the parent is not in the selection path |
| 1.3.9 | Build selection engine test suite with 30+ test cases | 3 | Given the test suite, when run, then all tests pass; coverage for `engine/selection/` is ≥ 90% |

#### Epic-Level Acceptance Criteria
- Tri-state logic is correct for trees up to 10 levels deep
- Undo/redo works reliably across all selection operations
- Payload estimates update within 10ms for schemas with 1,000 elements
- Schema search returns results within 50ms

#### DoD Addendum for Epic 1.3
- Coverage target: 90%+ for `engine/selection/` and `engine/analysis/`
- Selection toggle benchmarked at < 16ms (one frame) for 1,000-element schemas

#### Quality Gate 1.3
Standard QG1–QG7 plus:
- **QG-1.3-A:** Undo/redo tested with rapid-fire operations (20 toggles in 2 seconds) — no state corruption
- **QG-1.3-B:** Payload estimation validated against actual XML export sizes from 2+ client datasets (within 30% accuracy)

#### Refactor Gate 1.3
- Selection state must be a pure function: `(currentState, action) → newState` with no side effects — verify this pattern is enforced
- Analysis functions (payload estimation, explosion detection) must be independent of React — pure functions taking `SchemaNode[]` and `SelectionState`
- Remove any prototype patterns where the full `sel` object is passed as props to every tree node — prepare for memoisation in Epic 1.5

---

### Epic 1.4 — Generation Engine

**Duration:** Sprint 5 (Weeks 9–10)
**Refactor Gate Budget:** 2 days

#### Objective
Build the production filter XML generator and all four XSLT generators (Excel, CSV, Word, HTML) with correct escaping, validated output, and the pluggable generator architecture.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 1.4.1 | Implement XML filter generator with configurable indentation, XML declaration, and encoding | 3 | Given a selection of 15 fields, when the filter is generated, then the output is well-formed XML; leaf selections produce self-closing tags; container selections include only selected children |
| 1.4.2 | Define XSLT generator interface: `GeneratorInput` type containing columns, rowSource, style, groupBy, sortBy, title; implement generator registry with format-keyed lookup | 3 | Given the registry, when a new format is registered, then it is available for selection; the interface enforces all required parameters via TypeScript |
| 1.4.3 | Implement Excel XSLT generator with Office XML namespaces, FreezePanes, AutoFilter, mso-number-format, and alternating row styles | 5 | Given 10 columns with mixed formats (date, datetime, number, text), when XSLT is generated, then the output is well-formed XML; mso-number-format is applied correctly to date and number columns; Excel opens the HTML output without errors |
| 1.4.4 | Implement CSV XSLT generator with RFC 4180-compliant escaping: doubled quote characters instead of replacement, configurable delimiter, optional BOM for Excel compatibility, configurable line endings | 5 | Given column data containing commas, double quotes, and newlines, when the generated XSLT is applied to test XML, then the CSV output is RFC 4180 compliant; fields containing the delimiter or quotes are properly quoted and escaped |
| 1.4.5 | Implement Word XSLT generator with @page rules, orientation, margins, page-break-inside: avoid, metadata header, and styled tables | 3 | Given a landscape configuration with 1.5cm margins, when the XSLT is applied, then Word opens the output with correct orientation and margins |
| 1.4.6 | Implement HTML XSLT generator with responsive layout, sticky headers, hover effects, and print stylesheet | 3 | Given the generated HTML, when opened in Chrome, Firefox, and Edge, then the layout is responsive; headers stick on scroll; the page prints cleanly |
| 1.4.7 | Implement XSLT grouping with documented pre-sort requirement: generate `xsl:sort` before group-break detection; add a comment in generated XSLT noting the sort dependency | 5 | Given a grouping configuration on `ChannelName`, when XSLT is generated, then an `xsl:sort` on `ChannelName` precedes the group-break `xsl:if`; a comment in the XSLT explains the sort requirement |
| 1.4.8 | Implement XPath expression validation for column configurations: reject expressions containing `document()`, `system-property()`, or other potentially unsafe XPath functions | 3 | Given a column with XPath `document('http://evil.com')`, when validated, then the expression is rejected with an error message; safe expressions like `Programme/Title` pass |
| 1.4.9 | Implement XSLT output validation: parse the generated XSLT as XML and check well-formedness before presenting to user | 2 | Given a generated XSLT, when validated, then any well-formedness error is caught and reported to the user before download |
| 1.4.10 | Build report definition generator with all sections (Identity, DataSource, Output, Columns, Style, Execution, PackageContents) | 5 | Given full metadata, columns, and style configuration, when the report definition is generated, then it conforms to the `urn:mediagenix:whatson:report-definition:v1` schema; all file cross-references use the correct slug-based naming |
| 1.4.11 | Build XSLT validation test suite: 40+ test cases (10 per format) applying generated XSLT to sample broadcast XML and validating output structure | 8 | Given the test suite, when run with xsltproc or Saxon-JS, then all 40+ tests pass; output structure matches expected HTML/CSV/text patterns |
| 1.4.12 | Build special character stress test: XSLT generation with column headers and titles containing `& < > " ' \` and Unicode (accented characters, CJK, emoji) | 3 | Given special-character inputs, when XSLT is generated and applied, then all characters render correctly in the output; no XML well-formedness errors |

#### Epic-Level Acceptance Criteria
- All four XSLT formats produce correct, usable output when applied to the demo broadcast XML
- CSV output passes RFC 4180 validation
- Generated XSLT is always well-formed XML
- No unsafe XPath expressions can be injected into generated XSLT
- Report definition XML is well-formed and all file references are consistent

#### DoD Addendum for Epic 1.4
- Coverage target: 95%+ for `engine/generation/`
- XSLT validation tests run against actual XSLT processor (xsltproc, Saxon-JS, or browser XSLTProcessor)
- Special character test suite includes at least 50 distinct character combinations

#### Quality Gate 1.4
Standard QG1–QG7 plus:
- **QG-1.4-A:** Generated Excel output opened and validated in Microsoft Excel (not just a browser)
- **QG-1.4-B:** Generated Word output opened and validated in Microsoft Word
- **QG-1.4-C:** CSV output validated with a CSV linter tool
- **QG-1.4-D:** XSLT grouping tested with unsorted input data — verify the sort directive produces correct groups

#### Refactor Gate 1.4
- Each XSLT generator must be in its own file (the prototype has them all in one file as inline functions)
- Template string XSLT generation must use a structured builder pattern, not raw string interpolation — this prevents the class of bugs where a missing closing tag is invisible in a 50-line template literal
- `escXml` is used consistently everywhere user input enters generated XML — verify with grep that no raw interpolation exists
- CSV escaping follows RFC 4180 exactly — the prototype's `translate()` approach (replacing `"` with `\'`) must be completely replaced

---

### Epic 1.5 — Presentation Layer & Export Design UI

**Duration:** Sprint 6–7 (Weeks 11–14)
**Refactor Gate Budget:** 2 days

#### Objective
Build the production UI: interactive schema tree explorer, export configuration panel (format, row source, columns, style, preview), and output viewers (XSLT, Filter XML, Report Definition). Replace all prototype inline styles with CSS Modules and design tokens. Implement accessibility requirements.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 1.5.1 | Implement schema tree explorer component with ARIA tree role, keyboard navigation (Tab, Space, Enter, Arrow keys, Home, End), and progressive disclosure | 8 | Given a schema tree, when a user navigates with keyboard only, then all nodes are reachable, expandable, and selectable; ARIA attributes (`role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-selected`, `aria-level`) are present and correct |
| 1.5.2 | Implement tri-state checkbox component with accessible label, focus indicator, and colour-independent state indication (icon shape differs per state) | 3 | Given the three checkbox states, when viewed without colour (e.g., greyscale filter), then each state is visually distinguishable via shape; screen reader announces "checked", "partially checked", or "not checked" |
| 1.5.3 | Implement type badge, cardinality indicator, required-field marker, and payload impact bar as sub-components with tooltips | 3 | Given a node with type `dateTime`, cardinality `0..unbounded`, and required=false, then the type badge shows "dateTime" in blue, cardinality shows "0..∞" in red, no required marker; impact bar width is proportional to estimated weight |
| 1.5.4 | Implement hover documentation tooltip with max-width constraint, positioned to avoid viewport overflow | 2 | Given a node with 200-character documentation, when hovered, then the tooltip appears after 300ms delay, positioned within the viewport, with text wrapping |
| 1.5.5 | Implement tree toolbar: Expand All, Collapse All, Select All, Clear Selection, search input | 2 | Given the toolbar, when "Expand All" is clicked, then all nodes in the tree expand; when the search input is focused, then focus moves to the search field |
| 1.5.6 | Implement metrics bar: field count (selected/total), reduction percentage with colour coding, payload gauge bar | 2 | Given a selection, when metrics update, then the ARIA live region announces "15 of 80 fields selected, 72% reduction" for screen readers |
| 1.5.7 | Implement anti-pattern warning component: contextual, dismissible, with threshold configurable | 1 | Given a selection with < 20% reduction, when the warning appears, then it is an ARIA alert role and can be dismissed; threshold is configurable |
| 1.5.8 | Implement right panel tab container with keyboard-accessible tab switching (Arrow Left/Right, Home, End) following WAI-ARIA tabs pattern | 3 | Given the tab bar, when Arrow Right is pressed on the first tab, then focus moves to the second tab; the panel content updates; ARIA `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected` are present |
| 1.5.9 | Implement Export Design tab: format selector (grid of cards), row source dropdown, group-by/sort-by controls | 5 | Given the Export Design tab, when an output format is selected, then format-specific options appear (AutoFilter for Excel, delimiter for CSV, orientation for Word) |
| 1.5.10 | Implement column configuration panel with accessible drag-and-drop reordering (dnd-kit), inline header editing, format/alignment/width controls, auto-populate and clear actions | 8 | Given 10 columns, when a column is dragged from position 3 to position 7 using keyboard (Space to grab, Arrow Down to move, Space to drop), then the column order updates and the preview table reflects the change |
| 1.5.11 | Implement style configuration panel: preset selector, colour pickers, font selector, format-specific toggles | 3 | Given the style panel, when "Corporate" preset is selected, then header background changes to #1a365d; when a custom colour is picked, then the preview updates immediately |
| 1.5.12 | Implement preview table showing realistic sample data with selected columns and applied style | 3 | Given 5 configured columns, when the preview renders, then 3 rows of sample data are shown with correct headers, alignment, and style colours |
| 1.5.13 | Implement XSLT viewer tab with syntax highlighting (Shiki or Prism), copy-to-clipboard, and download button | 3 | Given generated XSLT, when the tab is active, then XSLT is displayed with syntax highlighting; when "Copy" is clicked, then the XSLT is on the clipboard; when "Download" is clicked, then the file downloads with the correct slug-based filename |
| 1.5.14 | Implement Filter XML viewer tab with syntax highlighting, copy, and download | 2 | Same as 1.5.13 but for the filter XML |
| 1.5.15 | Implement schema upload panel: file upload (drag-and-drop + file picker), XSD text paste area, demo schema button | 3 | Given the upload panel, when a .xsd file is dragged onto the drop zone, then the file is parsed and the tree updates; when invalid XML is pasted, then an error message appears |
| 1.5.16 | Implement tree node memoisation: `React.memo` with custom equality check to prevent re-rendering nodes whose selection and expansion state haven't changed | 5 | Given a 500-node tree, when a single node is toggled, then React Profiler shows < 20 component re-renders (not 500) |
| 1.5.17 | Implement `prefers-reduced-motion` support: disable expand/collapse animations, checkbox transitions | 1 | Given the `prefers-reduced-motion: reduce` media query active, when a node is expanded, then no animation occurs |
| 1.5.18 | Full axe-core accessibility audit and remediation for all UI components | 3 | Given the complete UI, when axe-core runs on every page state, then zero critical or serious violations are reported |

#### Epic-Level Acceptance Criteria
- All UI is navigable and operable via keyboard alone
- axe-core reports zero critical/serious accessibility violations
- Tree renders 500 nodes without perceptible lag (< 100ms initial render)
- All inline styles from prototype are replaced with CSS Modules
- Preview table accurately reflects column and style configuration

#### DoD Addendum for Epic 1.5
- Coverage target: 80%+ for `components/` via React Testing Library
- Every interactive component has at least one keyboard-navigation test
- Visual regression screenshots captured for all 5 style presets × 4 output formats

#### Quality Gate 1.5
Standard QG1–QG7 plus:
- **QG-1.5-A:** WCAG 2.1 AA compliance verified by manual audit (keyboard walkthrough + screen reader test with NVDA or VoiceOver)
- **QG-1.5-B:** Performance profiling of tree rendering with 500 nodes — initial render < 100ms, selection toggle < 16ms
- **QG-1.5-C:** Cross-browser visual verification in Chrome, Firefox, and Edge — no layout breaks

#### Refactor Gate 1.5
- No component file exceeds 200 lines — split large components into sub-components
- All style values reference design tokens — no hardcoded colours, font sizes, or spacing in component files (except in design token definitions)
- Component props are typed with explicit interfaces, not inline types
- No `useState` hooks that should be `useReducer` — complex state (e.g., column list with reorder/add/remove/update) should use reducer pattern

---

### Epic 1.6 — Packaging, Polish & Release

**Duration:** Sprint 8 (Weeks 15–16) — overlaps with hardening
**Refactor Gate Budget:** 2 days

#### Objective
Build the Package tab UI, implement three-file download, internationalisation framework, complete cross-browser testing, user documentation, and prepare for deployment.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 1.6.1 | Implement Package tab: report metadata editor (name, description, version, author, category, tags) with validation (name required, version format check) | 5 | Given the Package tab, when the user fills in metadata and clears the required "name" field, then a validation error appears and the download button is disabled |
| 1.6.2 | Implement execution settings: schedule toggle, cron expression input with human-readable preview, output path, email recipients, overwrite toggle | 5 | Given a cron expression `0 6 * * 1-5`, when entered, then the preview shows "Weekdays at 06:00 UTC" |
| 1.6.3 | Implement package file list with per-file status indicators, individual download buttons, and "View" buttons linking to the relevant tab | 2 | Given a complete configuration, when all three files are ready, then each shows a green status indicator; when fields are unselected, then the filter file shows an amber indicator |
| 1.6.4 | Implement "Download All 3 Files" button with sequential download (300ms delay between files to avoid browser blocking) and success feedback | 3 | Given a ready configuration, when "Download All" is clicked, then 3 files download with correct filenames; a success message appears for 3 seconds |
| 1.6.5 | Implement i18n framework with react-intl: extract all UI strings into message catalogues; provide English (en) and Dutch (nl) locales | 5 | Given the Dutch locale selected, when the UI renders, then all static text is in Dutch; all format-sensitive content (dates, numbers) uses Dutch formatting conventions |
| 1.6.6 | Implement Guide tab with workflow documentation, package file structure diagram, and import instructions | 2 | Given the Guide tab, when opened, then the five-step workflow is displayed with the current slug dynamically inserted into the file structure diagram |
| 1.6.7 | Cross-browser E2E test suite: 15+ scenarios covering all four personas' primary workflows | 8 | Given the E2E suite, when run against Chrome, Firefox, and Edge, then all 15+ scenarios pass in all browsers |
| 1.6.8 | Performance benchmarking with automated regression detection: all operations meet targets defined in Solution Design Section 11 | 3 | Given the benchmark suite, when run, then a report is generated showing pass/fail for each operation; CI fails if any operation exceeds 1.5× its target |
| 1.6.9 | Production build optimisation: tree-shaking, code splitting (lazy-load syntax highlighting library), minification, asset hashing | 2 | Given the production build, when analysed with `vite-bundle-visualizer`, then total bundle size is < 150KB gzipped (excluding syntax highlighting); Lighthouse Performance score > 90 |
| 1.6.10 | Deploy to staging environment; conduct user acceptance testing with 2–3 pilot users | 3 | Given the staging deployment, when 2+ pilot users complete the full workflow (load schema → select fields → configure export → download package), then they rate the experience ≥ 4/5 on the post-task survey |

#### Epic-Level Acceptance Criteria
- Complete three-file download works reliably across Chrome, Firefox, and Edge
- English and Dutch locales are complete and reviewed by a native speaker
- All E2E scenarios pass across all target browsers
- Production bundle meets size and Lighthouse targets
- At least 2 pilot users have completed the full workflow successfully

#### DoD Addendum for Epic 1.6
- Coverage target: 85%+ overall project coverage; 90%+ for engine modules
- All i18n strings reviewed for accuracy and completeness
- Changelog and Getting Started documentation complete

#### Quality Gate 1.6
Standard QG1–QG7 plus:
- **QG-1.6-A:** Pilot user acceptance — ≥ 4.0/5.0 satisfaction score from 2+ users
- **QG-1.6-B:** Lighthouse Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95
- **QG-1.6-C:** All 15+ E2E scenarios green across 3 browsers

#### Refactor Gate 1.6
- Final dependency audit: `npm audit` zero high/critical; no unused dependencies
- Bundle analysis: no unexpectedly large modules; code-splitting is effective
- Full TODO/FIXME/HACK sweep — all resolved or ticketed

---

### Phase 1 Technical Debt Review

**Timing:** After Epic 1.6 Refactor Gate, before Phase 2 begins
**Duration:** 3–5 days (dedicated Tech Debt Sprint)

#### Expected Debt Sources

| ID | Debt Item | Type | Likely Source | Severity |
|----|-----------|------|---------------|----------|
| TD-1.1 | Prototype patterns surviving migration — inline style remnants, imperative DOM manipulation, non-idiomatic React patterns | Code Debt | Rushed migration from prototype JSX | Medium |
| TD-1.2 | XSD parser edge cases for unsupported constructs (xs:group, xs:any, xs:notation) — currently errors; should degrade gracefully | Design Debt | Parser scope decisions in Epic 1.2 | High |
| TD-1.3 | Payload estimation accuracy — fixed multiplier model may diverge from real data; need to assess accuracy against actual client exports | Design Debt | Heuristic model in Epic 1.3 | Medium |
| TD-1.4 | XSLT string template maintainability — even with the builder pattern, XSLT generation via JavaScript string manipulation is fragile for complex templates | Design Debt | Fundamental architectural choice | Medium |
| TD-1.5 | Test doubles and fixtures — first-pass tests may use overly simplistic XSD fixtures that don't exercise real-world complexity | Test Debt | Time pressure during sprints | Medium |
| TD-1.6 | CSS Modules naming conventions — early components may not follow the final conventions established mid-phase | Code Debt | Convention evolution during development | Low |
| TD-1.7 | i18n completeness — dynamic strings (error messages, validation warnings) may be missed in the initial extraction pass | Documentation Debt | i18n extraction scope | Medium |

#### Review Process
1. Run static analysis suite; compare metrics against Epic 1.1 baseline
2. Run full test suite; identify flaky tests and tests with poor assertions
3. Run dependency age analysis; flag any dependency with known CVEs
4. Conduct architectural conformance check against the layer dependency diagram
5. Interview team: "What shortcuts did we take that we should fix?"
6. Prioritise using WSJF; schedule top items into the Phase 2 Tech Debt Sprint

#### Remediation Plan
- Allocate Week 17 (first week of Phase 2) as a dedicated Tech Debt Sprint
- Maximum 5 items from the Tech Debt Register are addressed
- Remaining items are re-prioritised and scheduled into Phase 2 sprints at 15% capacity allocation

---

## 3. Phase 2 — WHATS'ON Integration

**Duration:** 8 weeks (including 1 Tech Debt Sprint + 1 buffer week; extended from original 6)
**Goal:** XFEB embedded in WHATS'ON UI with bidirectional schema/package exchange
**Team:** 2 frontend engineers, 1 Smalltalk/backend engineer, 1 QA engineer

---

### Epic 2.1 — Tech Debt Remediation + Communication Bridge

**Duration:** Sprint 9 (Weeks 17–18)
**Refactor Gate Budget:** included in Tech Debt scope

#### Objective
Address Phase 1 tech debt (first week), then implement the PostMessage-based communication bridge between XFEB and WHATS'ON WebView, plus REST API endpoints for schema retrieval and package upload.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 2.1.1 | **Tech Debt Sprint:** Address top 5 items from Phase 1 Tech Debt Register | 13 | Given the 5 prioritised items, when remediated, then each item's acceptance criteria (defined in the Tech Debt Register) are met; no new debt is introduced |
| 2.1.2 | Implement PostMessage communication module: message types (`LOAD_SCHEMA`, `LOAD_CONFIG`, `PACKAGE_READY`, `SELECTION_CHANGED`), origin validation against whitelist, message serialisation/deserialisation | 5 | Given a message from a whitelisted origin, when received, then the handler processes it correctly; given a message from an unknown origin, then it is silently ignored and logged |
| 2.1.3 | Implement `LOAD_SCHEMA` handler: receive XSD content string, parse it, and display the tree — replacing the current manual upload flow | 3 | Given a LOAD_SCHEMA message with valid XSD content, when received, then the schema tree renders within 500ms; the upload panel is hidden in embedded mode |
| 2.1.4 | Implement `LOAD_CONFIG` handler: receive existing report definition XML, restore full application state (selection, columns, style, metadata) | 8 | Given a report definition XML generated by XFEB, when loaded via LOAD_CONFIG, then the selection tree matches the original selection; columns, style, metadata, and format are all restored; the user can continue editing |
| 2.1.5 | Implement `PACKAGE_READY` handler: serialise the three-file package as a JSON payload and send to the host via PostMessage | 3 | Given a complete configuration, when the user clicks "Save to WHATS'ON", then a PACKAGE_READY message is sent containing all three files as base64-encoded strings with content types and filenames |
| 2.1.6 | Implement `SELECTION_CHANGED` handler: emit current selection metrics (field count, reduction %, estimated payload) on every selection change | 2 | Given a selection change, when the handler fires (debounced 200ms), then a SELECTION_CHANGED message is sent with the current metrics |
| 2.1.7 | Implement REST API endpoints (specification only — implementation is Smalltalk-side): `GET /api/v1/export-configs/{templateId}/schema`, `GET /api/v1/export-configs/{templateId}/config`, `POST /api/v1/export-configs/{templateId}/package` | 3 | Given the API specification, when reviewed by the Smalltalk engineering team, then they confirm feasibility and commit to implementation in Sprint 10 |
| 2.1.8 | Implement embedded mode detection: auto-detect whether XFEB is running standalone or in an iframe/WebView; adapt UI accordingly (hide upload panel, show "Save to WHATS'ON" button) | 2 | Given XFEB loaded in an iframe, when the page loads, then embedded mode is auto-detected; the UI adapts without user intervention |

#### Epic-Level Acceptance Criteria
- PostMessage bridge works reliably between XFEB and a test harness simulating WHATS'ON
- Full state round-trip: `LOAD_CONFIG` → edit → `PACKAGE_READY` → `LOAD_CONFIG` reproduces the state
- Origin validation prevents cross-origin messages from being processed

#### DoD Addendum for Epic 2.1
- Coverage target: 90%+ for `bridge/` module
- PostMessage fuzz test: 50 malformed messages handled without errors

#### Quality Gate 2.1
Standard QG1–QG7 plus:
- **QG-2.1-A:** Round-trip state fidelity test: create config → export → re-import → compare — zero data loss
- **QG-2.1-B:** Security audit: origin validation tested with 10 different origins (5 whitelisted, 5 not)

#### Refactor Gate 2.1
- PostMessage module has zero direct imports from React components — it's a standalone event-driven module
- All message types are defined as TypeScript discriminated unions, not strings
- Tech debt items marked as "resolved" have passing tests covering the fixed issue

---

### Epic 2.2 — Import, Round-Trip & Migration

**Duration:** Sprint 10–11 (Weeks 19–22)
**Refactor Gate Budget:** 2 days

#### Objective
Build the WHATS'ON-side import module (Smalltalk), implement round-trip editing, version tracking, export template selector, and the migration analysis tool for existing extract-all configurations.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 2.2.1 | **[Smalltalk]** Implement report definition import module: parse report XML, validate package completeness (all referenced files present), create/update export configuration in WHATS'ON | 13 | Given a three-file package, when imported, then WHATS'ON creates a new export configuration with the filter, XSLT, and metadata from the package; missing files produce a clear error |
| 2.2.2 | **[Smalltalk]** Implement XSD extraction from WHATS'ON export template: serialize the template's data model as a W3C XSD document | 8 | Given an export template, when the XSD is extracted, then it accurately describes the template's output structure; the XSD is valid per W3C specification |
| 2.2.3 | **[Smalltalk]** Implement REST API endpoints from Epic 2.1.7 specification | 5 | Given the API endpoints, when called from XFEB, then schema retrieval, config retrieval, and package upload all work correctly with proper HTTP status codes and error messages |
| 2.2.4 | **[Smalltalk]** Implement WebView wrapper component in VisualWorks Smalltalk layout manager | 5 | Given the WebView wrapper, when XFEB is loaded, then it renders within the Smalltalk UI; the wrapper can be resized; PostMessage communication works |
| 2.2.5 | Implement export template selector dropdown: list available templates (via API), auto-load schema on selection | 3 | Given 5 available templates, when the dropdown is opened, then all 5 are listed; when one is selected, then its XSD is fetched and parsed automatically |
| 2.2.6 | Implement version tracking: compare imported configuration with current state; highlight changes (added fields, removed fields, changed columns, modified style) | 5 | Given an imported config that has been modified, when the version tracker runs, then a change summary shows "3 fields added, 1 field removed, 2 columns reordered" |
| 2.2.7 | Implement migration analysis tool: given an existing extract-all configuration, analyse the filter (or lack thereof), identify which fields are actually used by the XSLT, and suggest an optimised filter | 8 | Given an existing XSLT that only references 12 fields, when the migration tool analyses it, then it suggests a filter selecting exactly those 12 fields and reports "85% payload reduction possible" |
| 2.2.8 | Implement configuration diff view: side-by-side comparison of two configurations | 5 | Given two configurations, when compared, then added elements are highlighted green, removed elements red, changed columns amber; the view is keyboard-navigable |

#### Epic-Level Acceptance Criteria
- Full round-trip: create in XFEB → import into WHATS'ON → export from WHATS'ON → edit in XFEB → re-import — no data loss
- Migration tool accurately identifies used fields in 3+ existing client XSLT files
- WebView wrapper renders XFEB without layout issues in the Smalltalk UI

#### DoD Addendum for Epic 2.2
- Coverage target: 85%+ for migration analysis module
- Round-trip test suite with 10+ configuration variations

#### Quality Gate 2.2
Standard QG1–QG7 plus:
- **QG-2.2-A:** Migration tool tested against 3 real client XSLT files — suggestions are accurate (validated by a consultant who knows the client's actual data needs)
- **QG-2.2-B:** WebView performance: XFEB loads within 3 seconds inside the Smalltalk WebView; no UI freezing during tree operations

#### Refactor Gate 2.2
- Smalltalk code follows WHATS'ON coding conventions and has peer review from a senior Smalltalk engineer
- Migration analysis parser is a separate, testable module — not intertwined with UI logic
- API error handling follows consistent patterns: HTTP 4xx for client errors, 5xx for server errors, structured error response body

---

### Epic 2.3 — Integration Testing & Pilot

**Duration:** Sprint 12 (Weeks 23–24)
**Refactor Gate Budget:** 2 days

#### Objective
End-to-end integration testing, security audit, performance testing of the embedded deployment, and pilot deployment to 2–3 client environments.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 2.3.1 | End-to-end integration test suite: create configuration in XFEB → import into WHATS'ON → execute export → validate output matches expected data | 8 | Given the E2E suite, when run against a WHATS'ON staging instance, then all scenarios pass: the exported data matches the selected fields and the format matches the generated XSLT |
| 2.3.2 | Security audit: PostMessage origin validation, XSD injection prevention, XPath injection prevention, XSLT injection prevention, CSP configuration | 5 | Given the security audit checklist, when all tests are executed, then no critical or high-severity vulnerabilities are found |
| 2.3.3 | Performance testing of embedded deployment: measure WebView load time, tree rendering, selection operations, and XSLT generation under typical and stress conditions | 3 | Given performance tests, when run, then all operations meet Phase 1 performance targets; WebView-specific overhead is < 200ms on initial load |
| 2.3.4 | Pilot deployment to 2–3 client environments (standalone mode): provide deployment package, conduct training session, gather feedback | 5 | Given 2+ pilot clients, when trained, then each client successfully creates at least one export configuration; feedback is captured in a structured format |
| 2.3.5 | Feedback analysis and iteration: categorise feedback, prioritise, and implement high-priority items | 5 | Given categorised feedback, when analysed, then a prioritised list of improvements is produced; top 3 items are implemented within this sprint |

#### Epic-Level Acceptance Criteria
- E2E integration tests cover the full workflow from XFEB to WHATS'ON export output
- Security audit passes with zero critical/high findings
- Pilot clients successfully create and use export configurations
- Feedback is documented and prioritised for Phase 3

#### DoD Addendum for Epic 2.3
- Integration test suite is automated and can be re-run for regression
- Security audit report is documented and archived

#### Quality Gate 2.3
Standard QG1–QG7 plus:
- **QG-2.3-A:** Security audit sign-off from security reviewer
- **QG-2.3-B:** 2+ pilot clients confirm successful configuration creation
- **QG-2.3-C:** All performance targets met in embedded mode

#### Refactor Gate 2.3
- Integration test fixtures are maintainable: test data is separated from test logic; XSD fixtures are documented
- Security mitigations are covered by automated tests, not just manual audit
- Pilot feedback items that reveal architectural issues are added to Tech Debt Register (not just feature backlog)

---

### Phase 2 Technical Debt Review

**Timing:** After Epic 2.3 Refactor Gate
**Duration:** 3 days

#### Expected Debt Sources

| ID | Debt Item | Type | Likely Source | Severity |
|----|-----------|------|---------------|----------|
| TD-2.1 | PostMessage serialisation overhead — large configurations (100+ columns) may produce messages exceeding browser PostMessage size limits | Design Debt | Bridge architecture | High |
| TD-2.2 | Smalltalk WebView CSS compatibility — CSS features used by XFEB that may not render correctly in the Smalltalk WebView's browser engine | Code Debt | WebView engine limitations | Medium |
| TD-2.3 | API versioning strategy not fully defined — current endpoints are v1 but upgrade path is undocumented | Design Debt | Initial API design | Medium |
| TD-2.4 | Migration tool XSLT parser is simplistic — may not detect all field usage patterns in complex client XSLT (e.g., xsl:variable, xsl:key references) | Design Debt | Migration analysis scope | High |
| TD-2.5 | Test environment parity — staging environment may not match production WHATS'ON configurations | Test Debt | Infrastructure limitations | Medium |
| TD-2.6 | i18n coverage for new Phase 2 UI strings may be incomplete | Documentation Debt | Fast iteration on new features | Low |

#### Remediation Plan
- Allocate first 3 days of Phase 3 to address top 3 items
- Ongoing 10% capacity allocation during Phase 3 for remaining items

---

## 4. Phase 3 — Advanced Features

**Duration:** 8 weeks (extended from original 6; includes Tech Debt Sprint and buffer)
**Goal:** Data-aware tool with live preview, template library, and analytics
**Team:** 2 frontend engineers, 1 backend engineer, 1 QA engineer

---

### Epic 3.1 — Tech Debt + Live Data Preview

**Duration:** Sprint 13–14 (Weeks 25–28)
**Refactor Gate Budget:** 2 days

#### Objective
Address Phase 2 tech debt (first 3 days), then implement the live data preview feature: connect to WHATS'ON data source to show actual sample values alongside schema nodes.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 3.1.1 | **Tech Debt Sprint:** Address top 3 items from Phase 2 Tech Debt Register | 8 | Given the 3 prioritised items, when remediated, then each item passes its defined acceptance criteria |
| 3.1.2 | Implement sample data API: `GET /api/v1/export-configs/{templateId}/sample-data?fields=X,Y,Z&limit=5` — returns sample values for specified fields | 5 | Given a request for 3 fields with limit 5, when the API responds, then 5 sample values per field are returned; response time < 2 seconds |
| 3.1.3 | Implement data preview overlay on schema tree nodes: show 3–5 sample values in a compact tooltip alongside the existing documentation tooltip | 5 | Given a node with sample data loaded, when hovered, then sample values appear (e.g., "ChannelCode: VTM, één, Canvas, Vitaya") below the documentation text |
| 3.1.4 | Implement data-informed payload estimation: replace static multipliers with actual cardinality statistics from sample data | 8 | Given sample data showing 8 channels × 75 slots average, when the payload is estimated, then it uses 8 and 75 as multipliers instead of the default 50; the estimate is within 20% of actual export size |
| 3.1.5 | Implement preview table with real data: fetch sample data for configured columns and display in the preview table instead of synthetic data | 5 | Given 5 configured columns and a connected WHATS'ON instance, when the preview renders, then it shows actual data from the system; the preview updates when columns change |
| 3.1.6 | Implement offline/disconnected mode: gracefully degrade when API is unavailable (standalone mode); show synthetic data and static multipliers | 3 | Given no API connection, when the tool loads, then it functions identically to Phase 1 standalone mode; a non-intrusive indicator shows "Preview unavailable — no connection" |

#### Epic-Level Acceptance Criteria
- Sample data appears on schema nodes within 2 seconds of API response
- Payload estimates using real data are within 20% of actual export sizes
- Preview table shows real data when connected, synthetic data when disconnected
- No functionality regression in standalone mode

#### DoD Addendum for Epic 3.1
- Coverage target: 85%+ for data preview module
- Performance: data preview overlay renders within 100ms of data availability

#### Quality Gate 3.1
Standard QG1–QG7 plus:
- **QG-3.1-A:** Payload estimation accuracy validated against 3 real exports — within 20% of actual size
- **QG-3.1-B:** Standalone mode regression test — all Phase 1 E2E tests still pass

#### Refactor Gate 3.1
- Data fetching layer is abstracted behind a provider interface — components don't know whether data comes from API or synthetic source
- Sample data is cached with a configurable TTL (default 5 minutes) — no redundant API calls
- Tech debt items marked "resolved" have automated test coverage

---

### Epic 3.2 — Template Library & Sharing

**Duration:** Sprint 15 (Weeks 29–30)
**Refactor Gate Budget:** 1.5 days

#### Objective
Build a pre-built report template library for common use cases, with template browsing, preview, and one-click application.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 3.2.1 | Define template specification format: a JSON/XML format that encodes a complete XFEB configuration (selection, columns, style, metadata) as a distributable template | 3 | Given the specification, when a template is created and loaded, then the full state is restored; the format is forward-compatible (unknown fields are preserved, not rejected) |
| 3.2.2 | Create 5 standard templates: Daily Schedule, EPG Delivery, Rights Overview, Compliance Report, Commercial Breaks | 8 | Given each template, when applied to the demo broadcast schema, then all fields select correctly, columns populate, and the preview shows meaningful data; each template has a name, description, category, and thumbnail |
| 3.2.3 | Implement template browser UI: grid/list view of available templates with name, description, category filter, and preview thumbnail | 5 | Given 5+ templates, when the browser opens, then templates are displayed in a grid; category filter works; clicking a template shows a detail panel with preview |
| 3.2.4 | Implement "Apply Template" action: load template configuration into the current session with a confirmation dialog (warns about overwriting current state) | 3 | Given an active configuration, when a template is applied, then a confirmation dialog appears; on confirm, the state is replaced; on cancel, nothing changes; undo reverts to previous state |
| 3.2.5 | Implement "Save as Template" action: export the current configuration as a shareable template file | 3 | Given a complete configuration, when "Save as Template" is clicked, then a template file downloads containing the full state; the file can be loaded in another XFEB instance |
| 3.2.6 | **[Embedded mode]** Implement template library API: `GET /api/v1/templates`, `POST /api/v1/templates`, `DELETE /api/v1/templates/{id}` for server-side template storage | 5 | Given the API, when templates are listed/created/deleted, then the operations succeed with proper authorization checks |

#### Epic-Level Acceptance Criteria
- 5 standard templates are available and functional
- Templates can be applied, saved, and shared between XFEB instances
- Template format is documented and versioned

#### DoD Addendum for Epic 3.2
- Coverage target: 85%+ for template module
- Each standard template tested against the demo schema end-to-end

#### Quality Gate 3.2
Standard QG1–QG7 plus:
- **QG-3.2-A:** Standard templates reviewed by a Professional Services consultant for real-world accuracy
- **QG-3.2-B:** Template format forward-compatibility test: a v1.0 template loads correctly in a v1.1 app

#### Refactor Gate 3.2
- Template specification is versioned with a `schemaVersion` field
- Template storage is abstracted: file-based for standalone, API-based for embedded — same interface
- No template logic is coupled to specific schema structures (templates are schema-agnostic at the code level)

---

### Epic 3.3 — Analytics, Diff & Collaboration

**Duration:** Sprint 16–17 (Weeks 31–34)
**Refactor Gate Budget:** 2 days

#### Objective
Implement usage analytics (anonymous), configuration diff/compare, and the foundation for collaborative editing.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 3.3.1 | Implement anonymous usage analytics: track field selection frequency, output format popularity, template usage, session duration — all aggregated, no PII | 5 | Given analytics enabled, when a user completes a session, then anonymised metrics are recorded; no user-identifying data is collected; analytics can be disabled via config |
| 3.3.2 | Implement analytics dashboard (internal): visualise field selection heat maps, format distribution, template popularity, adoption trends | 5 | Given accumulated analytics data, when the dashboard loads, then charts show field usage frequency, format distribution, and adoption trends over time |
| 3.3.3 | Implement configuration diff: accept two configurations (current vs. imported, current vs. template, two arbitrary configs) and produce a structured diff | 5 | Given two configs differing in 5 fields, 2 columns, and 1 style setting, when diffed, then all 8 changes are listed; each change shows the path, old value, and new value |
| 3.3.4 | Implement diff viewer UI: side-by-side or inline view with colour-coded changes, navigation between changes, and "accept" action for selective merge | 8 | Given a diff with 8 changes, when the viewer opens, then changes are colour-coded (green=added, red=removed, amber=modified); keyboard navigation cycles through changes; "accept" applies a single change |
| 3.3.5 | Implement collaborative editing foundation: operational transform or CRDT-based state synchronisation for selection and column state; WebSocket connection management | 13 | Given 2 users editing the same configuration, when user A selects a field, then user B's view updates within 500ms; conflicting operations (both modify the same column) resolve without data loss |
| 3.3.6 | Implement user presence indicators: cursors showing which tree node each collaborator is viewing, user name labels | 3 | Given 2 connected users, when user A hovers over a node, then user B sees a labelled cursor on that node |

#### Epic-Level Acceptance Criteria
- Analytics capture meaningful usage data without PII
- Diff viewer correctly identifies and displays all change types
- Collaborative editing maintains state consistency between 2+ simultaneous users

#### DoD Addendum for Epic 3.3
- Coverage target: 80%+ for analytics and diff modules; 70%+ for collaborative editing (lower due to real-time complexity)
- Collaborative editing tested with simulated latency (100ms, 500ms, 2000ms)

#### Quality Gate 3.3
Standard QG1–QG7 plus:
- **QG-3.3-A:** Privacy audit: analytics data reviewed to confirm zero PII collection
- **QG-3.3-B:** Collaborative editing conflict resolution tested with 10 concurrent change scenarios
- **QG-3.3-C:** Diff viewer tested with configurations differing in 0, 1, 10, and 50+ changes

#### Refactor Gate 3.3
- Analytics module is fully decoupled — removing it has zero impact on core functionality
- Collaborative editing state sync is behind a feature flag — can be disabled without code changes
- WebSocket connection management handles reconnection, offline buffering, and clean disconnect

---

### Phase 3 Technical Debt Review

**Timing:** After Epic 3.3 Refactor Gate
**Duration:** 3 days

#### Expected Debt Sources

| ID | Debt Item | Type | Likely Source | Severity |
|----|-----------|------|---------------|----------|
| TD-3.1 | Real-time collaboration introduces significant state management complexity — reducer pattern may need architectural revision | Design Debt | Collaborative editing | High |
| TD-3.2 | Analytics telemetry may impact performance on low-end devices if event volume is high | Code Debt | Analytics instrumentation | Medium |
| TD-3.3 | Template format v1.0 may need revision based on real usage patterns discovered during pilot | Design Debt | Template specification | Medium |
| TD-3.4 | WebSocket dependency introduces a server component — contradicts original "local-first" principle for standalone mode | Design Debt | Collaborative editing architecture | High |
| TD-3.5 | Diff algorithm performance for large configurations (100+ columns, 500+ fields) untested | Code Debt | Diff engine | Medium |
| TD-3.6 | Growing test suite execution time — may need test parallelisation or selective test runs | Test Debt | Cumulative test growth | Low |

#### Remediation Plan
- Architectural review of collaboration's impact on standalone mode — consider making it an opt-in plugin
- Performance profiling of analytics on low-end devices — implement batching and sampling if needed
- Allocate first 3 days of Phase 4 for remediation

---

## 5. Phase 4 — Optimisation & Scale

**Duration:** 6 weeks (extended from original 4; includes Tech Debt Sprint and final hardening)
**Goal:** Enterprise-ready performance, deployment hardening, and comprehensive documentation
**Team:** 2 engineers, 1 QA engineer, 1 technical writer (part-time)

---

### Epic 4.1 — Tech Debt + Performance Engineering

**Duration:** Sprint 18–19 (Weeks 35–38)
**Refactor Gate Budget:** 2 days

#### Objective
Address Phase 3 tech debt, then optimise for large schemas (1,000+ elements): virtual scrolling, Web Worker XSD parsing, memoised calculations, and XSLT optimisation.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 4.1.1 | **Tech Debt Sprint:** Address top 4 items from Phase 3 Tech Debt Register | 13 | Given the 4 prioritised items, when remediated, then each passes its acceptance criteria |
| 4.1.2 | Implement virtual scrolling for the schema tree: only render visible nodes (viewport + 20-node buffer) | 8 | Given a 1,000-node tree with all nodes expanded, when scrolled, then only ~50 nodes are in the DOM; scroll performance is smooth (60fps); keyboard navigation still works correctly |
| 4.1.3 | Offload XSD parsing to a Web Worker: parse large schemas without blocking the UI thread | 5 | Given a 1,000-element XSD, when parsed in a Web Worker, then the UI remains responsive during parsing; a progress indicator shows parsing status; result is transferred to the main thread via structured clone |
| 4.1.4 | Implement memoised selection state calculations: `useMemo` with granular dependency tracking for payload estimates, check states, and reduction percentages | 3 | Given a 1,000-element tree with 200 selected, when a single node is toggled, then payload recalculation takes < 10ms; only affected subtree states are recomputed |
| 4.1.5 | Implement XSLT optimisation: use `xsl:key` for grouping instead of `preceding-sibling` axis; factor repeated patterns into named templates; add output streaming hints | 5 | Given a grouping configuration, when XSLT is generated, then `xsl:key` is used for group detection; the generated XSLT is measurably faster when applied to a 10MB test XML (< 50% of non-optimised execution time) |
| 4.1.6 | Implement lazy node expansion: collapsed subtrees are not parsed into React component trees until first expanded | 3 | Given a 1,000-node tree all collapsed, when the tree renders, then < 20 components are mounted; expanding a node with 50 children adds 50 components |
| 4.1.7 | Performance regression test suite: automated benchmarks for all operations in the performance budget (Section 11 of Solution Design); CI fails if any benchmark regresses > 20% | 5 | Given the benchmark suite, when run in CI, then a report is generated; any regression > 20% fails the pipeline with a clear message indicating which operation regressed |

#### Epic-Level Acceptance Criteria
- 1,000-element schemas parse, render, and interact within performance budgets
- Virtual scrolling maintains accessibility (keyboard navigation, screen reader)
- No performance regressions on small/medium schemas

#### DoD Addendum for Epic 4.1
- All performance budgets met for 100, 500, and 1,000-element schemas
- Virtual scrolling passes the full accessibility test suite

#### Quality Gate 4.1
Standard QG1–QG7 plus:
- **QG-4.1-A:** Performance benchmarks pass for all three schema sizes
- **QG-4.1-B:** Virtual scrolling accessibility verified with screen reader
- **QG-4.1-C:** XSLT execution time improvement validated with a 10MB test XML

#### Refactor Gate 4.1
- Virtual scrolling implementation does not leak abstractions into component code — tree node components are unaware they're virtualised
- Web Worker communication uses typed message passing, not string-based protocols
- Performance test infrastructure is maintainable: adding a new benchmark requires < 10 lines of code

---

### Epic 4.2 — Deployment Hardening & Documentation

**Duration:** Sprint 20–21 (Weeks 39–42)
**Refactor Gate Budget:** 2 days (final gate)

#### Objective
Docker containerisation, CDN deployment configuration, cache busting, monitoring, error tracking, and comprehensive documentation for all personas.

#### Stories

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|-------------------|
| 4.2.1 | Create Docker containerisation for standalone deployment: multi-stage build, nginx serving, health check endpoint, configurable environment variables | 5 | Given the Dockerfile, when built, then the image size is < 50MB; the container starts in < 5 seconds; the health check endpoint returns 200; environment variables configure the origin whitelist and analytics endpoint |
| 4.2.2 | Implement CDN deployment configuration: asset hashing, cache headers, blue-green deployment script | 3 | Given the deployment script, when executed, then assets are uploaded to CDN with content-hashed filenames; old assets are preserved for 24 hours; the index.html references the new asset hashes |
| 4.2.3 | Implement client-side error tracking: capture and report JavaScript errors, unhandled promise rejections, and parser failures; integrate with monitoring platform (Sentry or equivalent) | 3 | Given a runtime error, when caught, then it is reported to the monitoring platform with stack trace, browser info, and schema context (not schema content); error rate dashboard is available |
| 4.2.4 | Implement application monitoring: page load time, parse time, generation time, download time — reported as custom metrics | 2 | Given the monitoring integration, when metrics are reported, then a dashboard shows p50/p95/p99 for each operation over time |
| 4.2.5 | Write Administrator Guide: deployment options (standalone, embedded, Docker), configuration, updates, monitoring, troubleshooting | 5 | Given the guide, when reviewed by 2 engineers not on the project, then they can deploy XFEB standalone without additional assistance |
| 4.2.6 | Write User Guide: Getting Started for each persona (Scheduler, Operations Manager, Technical Integrator, Consultant); XSD loading; field selection; export design; packaging; import into WHATS'ON | 8 | Given the guide, when reviewed by a non-technical person (simulating Scheduler persona), then they can follow the Getting Started section to produce a working export configuration |
| 4.2.7 | Write API Reference: PostMessage protocol, REST API endpoints, template format specification, report definition XML schema | 3 | Given the reference, when reviewed by the Smalltalk integration team, then they confirm completeness and accuracy |
| 4.2.8 | Write XSD Authoring Guide: how to create XSD files that work optimally with XFEB; common patterns, known limitations, trang inference guide | 3 | Given the guide, when followed by a Technical Integrator, then they can create an XSD from a sample XML export and load it into XFEB successfully |
| 4.2.9 | Final regression test suite execution across all browsers and deployment modes (standalone, embedded, Docker) | 5 | Given the full test suite, when run across all configurations, then all tests pass; the regression report is archived as the release quality baseline |
| 4.2.10 | Create release package: versioned build, release notes, deployment guide, migration guide from previous version | 3 | Given the release package, when deployed by an operations team, then the deployment succeeds following the guide without escalation |

#### Epic-Level Acceptance Criteria
- Docker image builds and runs successfully
- CDN deployment works with zero-downtime updates
- Error tracking captures and reports errors without exposing user data
- All four documentation guides are complete and reviewed
- Full regression suite passes across all configurations

#### DoD Addendum for Epic 4.2
- Documentation reviewed by at least one person outside the development team
- Docker image tested on Linux and Windows Server (via WSL)
- Release notes are complete and accurate

#### Quality Gate 4.2
Standard QG1–QG7 plus:
- **QG-4.2-A:** Documentation usability test — 2 people from target personas follow the guides successfully
- **QG-4.2-B:** Docker deployment tested on a clean machine with no pre-existing dependencies
- **QG-4.2-C:** Error tracking verified: intentionally trigger 3 error types, confirm all appear in the monitoring dashboard

#### Refactor Gate 4.2 (Final)
- Complete codebase audit: no function exceeds complexity limits; no module exceeds 400 lines; zero circular dependencies
- Full dependency audit: all dependencies at latest minor version; zero known vulnerabilities
- Complete TODO/FIXME/HACK sweep: zero remaining
- API surface freeze: all exports documented; no accidental public API
- Test quality audit: no skipped tests; no snapshot-only tests without review annotations; coverage meets all targets

---

### Phase 4 Technical Debt Review (Final)

**Timing:** After Epic 4.2 Refactor Gate
**Duration:** 2 days (lighter than previous reviews — focus on long-term health)

#### Focus Areas

| ID | Review Area | Action |
|----|-------------|--------|
| TD-4.1 | Dependency health — any dependencies approaching EOL or with unresolved CVEs | Update or replace; document in maintenance guide |
| TD-4.2 | Architecture conformance — does the final codebase match the intended architecture diagram from Epic 1.1? | Document any intentional deviations as ADRs |
| TD-4.3 | Test suite health — execution time, flakiness rate, coverage trends | Optimise slow tests; quarantine flaky tests; set coverage floors |
| TD-4.4 | Documentation accuracy — do the guides match the final product? | Final review pass on all documentation |
| TD-4.5 | Monitoring and alerting — are the right things being monitored? Are alert thresholds reasonable? | Tune thresholds based on staging data |

#### Output
- **Maintenance Runbook:** a document for the team inheriting ongoing maintenance, covering: how to add a new XSLT format, how to update parser for new XSD constructs, how to add a locale, how to debug common issues
- **Technical Debt Backlog:** any remaining items ranked for the post-GA maintenance phase

---

## 6. Summary Timeline

```
Week  1–2   │ Epic 1.1  Foundation & Infrastructure          ██
Week  3–6   │ Epic 1.2  Schema Engine (Production)           ████████
Week  7–8   │ Epic 1.3  Selection Engine & Analysis           ████
Week  9–10  │ Epic 1.4  Generation Engine                     ████
Week 11–14  │ Epic 1.5  Presentation Layer & Export Design    ████████
Week 15–16  │ Epic 1.6  Packaging, Polish & Release           ████
            │ ── Phase 1 Tech Debt Review ──
Week 17–18  │ Epic 2.1  Tech Debt + Communication Bridge      ████
Week 19–22  │ Epic 2.2  Import, Round-Trip & Migration        ████████
Week 23–24  │ Epic 2.3  Integration Testing & Pilot           ████
            │ ── Phase 2 Tech Debt Review ──
Week 25–28  │ Epic 3.1  Tech Debt + Live Data Preview         ████████
Week 29–30  │ Epic 3.2  Template Library & Sharing            ████
Week 31–34  │ Epic 3.3  Analytics, Diff & Collaboration       ████████
            │ ── Phase 3 Tech Debt Review ──
Week 35–38  │ Epic 4.1  Tech Debt + Performance Engineering   ████████
Week 39–42  │ Epic 4.2  Deployment Hardening & Documentation  ████████
            │ ── Phase 4 Tech Debt Review (Final) ──
```

**Total duration:** 42 weeks (~10.5 months)
**Phase 1 (Standalone):** 16 weeks — delivers immediate value with zero WHATS'ON changes
**Phase 2 (Integration):** 8 weeks — delivers embedded experience
**Phase 3 (Advanced):** 10 weeks — delivers data-aware, collaborative tool
**Phase 4 (Scale):** 8 weeks — delivers enterprise-ready product

---

## 7. Cross-Cutting Concerns

### 7.1 Risk Escalation
Any risk from the Risk Register (Solution Design Section 12) that materialises during a sprint is escalated immediately:
- **R1 (Parser failures):** Escalate to Technical Architect; may extend Epic 1.2
- **R2 (XSLT edge cases):** Escalate to QA Lead; additional XSLT validation tests added
- **R5 (Adoption resistance):** Escalate to Product Owner; may reprioritise migration tooling

### 7.2 Quality Metrics Dashboard
A persistent dashboard tracks across all phases:
- Test coverage (overall and per-module)
- Static analysis scores (complexity, duplication)
- Dependency health (vulnerabilities, staleness)
- Performance benchmark trends
- Bug open/close rates by severity
- Tech debt item count and trend

### 7.3 Continuous Improvement
Each Phase Tech Debt Review includes a 1-hour retrospective focused on the development process itself:
- Did the DoR prevent unready work from entering sprints?
- Did the DoD catch quality issues before they reached staging?
- Were the Quality Gates and Refactor Gates valuable or just ceremony?
- What should change in the governance framework for the next phase?

Governance is itself subject to iteration. If a gate criterion is never triggered, it should be reviewed for removal. If a class of defects keeps escaping, a new gate criterion should be added.
