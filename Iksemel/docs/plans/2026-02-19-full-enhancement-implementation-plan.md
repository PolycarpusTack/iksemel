# XFEB Full Enhancement Implementation Plan

Date: February 19, 2026
Owner: Engineering
Status: Proposed

## 1. Objective

Implement the complete enhancement set previously proposed, end-to-end, while keeping the product within scope:

1. Dev rerender diagnostics (`why-did-you-render`)
2. Large-tree performance (`@tanstack/virtual-core` or `@tanstack/react-virtual`)
3. Faster ZIP packaging backend (`fflate`, benchmarked against `jszip`)
4. XML pre-validation layer (`fast-xml-parser`)
5. Policy runtime expansion (OPA Wasm via `npm-opa-wasm`)
6. XSLT correctness suite (XSpec)
7. Advanced XML/XSLT code-view UX (`monaco-editor`)

Primary product goals remain unchanged: generate valid XML filter, XSLT transform, and report package for WHATS'ON workflows.

## 2. Scope

### In Scope

- Performance, correctness, and developer productivity improvements in current app architecture.
- CI and test workflow expansion required to support the enhancements.
- Incremental rollout with feature flags and fallback paths where needed.

### Out of Scope

- Server-side architecture changes.
- Changes to existing business/domain model contracts unless required by OPA integration.
- Multi-tenant or cloud deployment redesign.

## 3. Delivery Strategy

Use vertical slices and keep each slice releasable. Every step should preserve current behavior by default unless explicitly enabled.

## 4. Workstreams and PR Plan

## WS1: Dev Rerender Diagnostics

Repository: https://github.com/welldone-software/why-did-you-render

### PR6 - Development-only rerender diagnostics

- Add `why-did-you-render` as a dev-only dependency.
- Configure conditional bootstrap in development mode only.
- Annotate high-churn components (`LeftPanel`, `RightTabs`, `SchemaTree`, key tab content wrappers) with display names/WDYR tracking.
- Add npm script to toggle diagnostics (`dev:wdyr`).

Acceptance criteria:

- No production bundle impact.
- In development, avoidable rerenders are logged with clear component-level reasons.
- Existing tests/build remain green.

## WS2: Large Schema Tree Virtualization

Repository: https://github.com/TanStack/virtual

### PR7 - Integrate TanStack virtualized rendering for schema tree

- Replace or refactor current tree virtualization to TanStack-based virtualizer.
- Support dynamic row heights if needed (or standardize row heights for first pass).
- Preserve keyboard nav, focused node, and search highlight behavior.
- Benchmark large schemas (1k, 5k, 10k visible nodes).

Acceptance criteria:

- Scroll and interaction remain responsive on 10k-node datasets.
- Feature parity for selection, expansion, focus, and search navigation.
- No regression in accessibility basics (tab/focus flow).

## WS3: ZIP Backend Abstraction + `fflate`

Repository: https://github.com/101arrowz/fflate

### PR8 - Pluggable package compressor and benchmark harness

- Introduce `ZipBackend` interface in package generation module.
- Keep `jszip` backend as baseline.
- Implement `fflate` backend.
- Add benchmark script comparing build time, memory (approx), and output size.
- Add default backend selection policy with fallback.

Acceptance criteria:

- Packaging output remains structurally identical and import-compatible.
- Benchmark report committed under `docs/benchmarks/`.
- Backend can be switched by config/flag without code changes.

## WS4: XML Pre-validation Layer

Repository: https://github.com/NaturalIntelligence/fast-xml-parser

### PR9 - Add XML well-formedness validation and error surfacing

- Add parser/validator adapter around XML inputs before deeper processing.
- Normalize parse errors into current toast/reporting UX.
- Add safeguards for malformed or truncated XML blobs.
- Add tests for invalid XML edge cases.

Acceptance criteria:

- Malformed XML fails early with actionable error text.
- No silent failures in pipeline.
- Existing valid flows unaffected.

## WS5: OPA Wasm Policy Runtime

Repository: https://github.com/open-policy-agent/npm-opa-wasm

### PR10 - Introduce optional OPA-backed policy evaluator

- Create policy engine abstraction:
  - existing native evaluator (default)
  - OPA evaluator (flag-enabled)
- Define input document schema passed to policy runtime.
- Compile and load OPA Wasm policy bundle in app runtime (dev + prod path handling).
- Add deterministic tests comparing native vs OPA on canonical policy fixtures where semantics overlap.

Acceptance criteria:

- OPA policy evaluation works behind feature flag.
- Existing policy behavior unchanged when flag is off.
- Clear error handling for policy load/eval failures.

## WS6: XSpec-based XSLT Correctness Suite

Repository: https://github.com/xspec/xspec

### PR11 - Add XSpec harness to CI for generated XSLT outputs

- Add XSpec test assets for representative export scenarios.
- Add script to generate XSLT fixtures from current app generator.
- Run XSpec in CI job (separate from Vitest, can be optional-required initially).
- Document contribution workflow for adding new XSpec cases.

Acceptance criteria:

- CI executes XSpec suite consistently.
- At least core format scenarios are covered.
- Failing XSLT behavior is caught before merge.

## WS7: Monaco-based Code Viewer Upgrade

Repository: https://github.com/microsoft/monaco-editor

### PR12 - Replace/simple-wrap current code viewer with Monaco

- Integrate Monaco only for relevant tabs (XSLT/Filter/Report), with lazy loading.
- Configure read-only mode first, then optional edit mode behind flag.
- Enable search, folding, minimap toggle, and syntax highlighting.
- Keep current lightweight viewer as fallback path if Monaco load fails.

Acceptance criteria:

- Tabs remain functional and responsive.
- Bundle growth controlled via code splitting.
- No break in existing download/package flow.

## 5. Architecture Changes Required

- Add feature flag service:
  - `flags.useOpaPolicy`
  - `flags.useMonacoViewer`
  - `flags.useFflateZip`
- Add `ZipBackend` abstraction and policy engine abstraction.
- Add benchmark and test artifacts directories:
  - `docs/benchmarks/`
  - `tests/xspec/`

## 6. Testing and Quality Gates

Every PR must pass:

- `npm run typecheck`
- `npm run test`
- `npm run build`

Additional gates by workstream:

- WS2: performance benchmark threshold checks.
- WS3: output equivalence tests between ZIP backends.
- WS5: policy parity tests + error-path tests.
- WS6: XSpec CI job must pass.
- WS7: UI behavior tests for code-view tabs.

## 7. Rollout and Risk Control

- Keep all major behavior changes behind flags first.
- Maintain fallback implementations for:
  - ZIP backend (`jszip`)
  - policy evaluator (native)
  - code viewer (current viewer)
- Progressive rollout order:
  1. internal dev flag
  2. staging default-on
  3. production default-on after burn-in

## 8. Timeline (Proposed)

Assuming 2-week sprints, start Monday, February 23, 2026.

Sprint 1 (February 23 - March 6, 2026):

- PR6 (WS1)
- PR7 (WS2)

Sprint 2 (March 9 - March 20, 2026):

- PR8 (WS3)
- PR9 (WS4)

Sprint 3 (March 23 - April 3, 2026):

- PR10 (WS5)
- PR11 (WS6)

Sprint 4 (April 6 - April 17, 2026):

- PR12 (WS7)
- hardening, regression sweep, docs finalization

## 9. Risk Register

1. Monaco bundle weight and startup latency.

- Mitigation: strict lazy loading, fallback viewer, monitor chunk sizes.

2. OPA semantic drift from current native policies.

- Mitigation: parity fixtures and dual-evaluation compare mode in staging.

3. XSpec CI complexity and runtime instability.

- Mitigation: isolated CI job, cache setup, deterministic fixtures.

4. Virtualized tree interaction regressions.

- Mitigation: preserve behavior tests for focus, keyboard navigation, and selection.

5. Compressor migration edge cases.

- Mitigation: byte-level or structural output verification against golden packages.

## 10. Deliverables

By end of PR12:

- Improved render diagnostics and measurable rerender control.
- Scalable tree interaction for very large schemas.
- Benchmarked and switchable packaging backend.
- Early XML validation and stronger error UX.
- Optional enterprise policy runtime path (OPA).
- XSpec-backed XSLT correctness coverage in CI.
- Enhanced code-view experience with Monaco.

## 11. Definition of Done for This Plan

Plan is complete when all PR6-PR12 are merged and:

- Feature flags documented.
- Benchmarks and XSpec docs committed.
- All fallback paths validated.
- Final regression test pass recorded.
