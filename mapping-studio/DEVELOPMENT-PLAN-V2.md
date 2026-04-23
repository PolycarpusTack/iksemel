# Mapping Studio - Development Plan (V2)

Date: 2026-02-17
Status: Proposed
Plan horizon: 16 weeks
Team baseline: 2 full-stack engineers, 1 UX designer (0.5), 1 QA (0.5)

## 1. Delivery Strategy

Approach:
- Deliver a usable vertical slice by week 6.
- Keep backend optional in early milestones, mandatory before production.
- Gate each phase with measurable acceptance criteria.

Phases:
1. Foundation (Weeks 1-4)
2. Guided Mapping MVP (Weeks 5-8)
3. Robustness + Scale (Weeks 9-12)
4. Production Readiness (Weeks 13-16)

## 2. Workstreams

1. Architecture + Contracts
- Mapping contracts (`MappingSpec`, migration schema)
- Canonical schema adapters
- Validation rules and error taxonomy

2. Source Ingestion
- Database introspection provider
- XSD and XML sample integration hardening
- Provenance and confidence scoring

3. UX/CX
- Wizard UX
- Relationship explanations
- Business glossary flow
- Empty/error/recovery states

4. Mapping Engine
- Root detection and relationship classification
- Field recommendation heuristics
- Mapping-to-schema and mapping-to-XSD generation

5. Quality + Ops
- Unit/integration/e2e tests
- Performance benchmarks
- Observability and structured telemetry

## 3. Milestones

## M1 - Foundation Complete (End of Week 4)

Deliverables:
- Stable mapping data model + migration framework
- Deterministic serializer/deserializer
- Provider contract test suite
- Baseline DB introspection service contract

Acceptance:
- Contract tests pass in CI
- Typecheck + lint + unit tests green
- At least 3 fixture schemas round-trip successfully

## M2 - Guided Mapping MVP (End of Week 8)

Deliverables:
- End-to-end wizard for source -> mapping -> preview
- Root/relationship suggestions with explanations
- Mapping save/load + version history
- XFEB handoff from generated schema

Acceptance:
- Pilot users can create a valid mapping without admin help
- Median completion time <= 20 minutes (initial target)
- No P1/P2 defects in mapping flow

## M3 - Robustness + Scale (End of Week 12)

Deliverables:
- Canvas mode with auto-layout and keyboard fallback
- Low-confidence/ambiguity diagnostics
- Large-schema performance optimization
- Mapping diff/compare between versions

Acceptance:
- 1,500 nodes benchmark within target latency
- Full keyboard flow passes a11y checklist
- Mapping corruption incidents: zero across regression suite

## M4 - Production Readiness (End of Week 16)

Deliverables:
- Security hardening (secret handling, auth boundaries)
- Telemetry dashboards (errors, abandon points, completion time)
- Migration playbook and rollback procedures
- Release docs and runbook

Acceptance:
- Go-live checklist complete
- SLO dashboard active
- Controlled pilot sign-off from business stakeholders

## 4. Sprint Plan (2-week sprints)

Sprint 1:
- Finalize contracts and migration format
- Build mapping engine skeleton + tests

Sprint 2:
- Implement database introspection adapter
- Add confidence scoring and provenance plumbing

Sprint 3:
- Build guided wizard shell and recommendation UI
- Mapping save/load, versioning, validation panel

Sprint 4:
- XFEB handoff integration
- Pilot usability tests and UX fixes

Sprint 5:
- Introduce canvas mode and auto-layout
- Performance profiling and optimization pass

Sprint 6:
- Add ambiguity diagnostics and mapping diff
- Expand regression/e2e coverage

Sprint 7:
- Security hardening and observability
- Docs, migration guide, operational runbook

Sprint 8:
- Pilot release, bug bash, stabilization
- Production release decision

## 5. Technical Backlog (Prioritized)

P0:
- `DatabaseSchemaProvider` with PK/FK extraction
- `MappingSpec` schema + migration framework
- `mappingToSchema()` and `mappingToXsd()`
- Guided wizard with root selection and field recommendation

P1:
- Relationship explanation engine
- Ambiguity/confidence warnings
- Mapping version diff and rollback

P2:
- Canvas interactions and advanced layout controls
- Team sharing and approval workflows

## 6. Risk Register

1. Ambiguous joins in legacy databases
- Mitigation: confidence scoring + mandatory user confirmation

2. Performance degradation on large schemas
- Mitigation: incremental rendering, memoized graph transforms, virtualized panels

3. Hidden domain semantics not present in DB metadata
- Mitigation: glossary/rule editor and review gate

4. Breaking changes in mapping contract over time
- Mitigation: explicit migration versions and backward-compatible loaders

## 7. QA Strategy

Test layers:
- Unit: mapping algorithms, serializers, validators
- Integration: source provider -> mapping engine -> generated schema
- E2E: full user journey from ingestion to XFEB handoff
- Accessibility: keyboard-only and screen-reader checks
- Performance: synthetic large-schema fixtures

Quality gates:
- 85%+ coverage in `engine/mapping`
- Zero critical accessibility violations
- P95 initial load under 2s for benchmark fixtures

## 8. Repository Adoption Plan (GitHub)

Adopt incrementally with ADRs.

Wave 1 (M1-M2):
- `zod` for schema validation
- `xstate` for wizard state orchestration

Wave 2 (M2-M3):
- `xyflow` + `elkjs` for canvas and layout
- `dagre` as fallback for simple layouts

Wave 3 (M3-M4):
- `prisma` or `knex` backend adapter path for DB metadata service
- `xmldom` for Node-side XML tooling consistency

## 9. Immediate Next Actions (Next 10 Days)

1. Lock v2 contracts:
- Create `mapping-studio/contracts/` package with schema + fixtures.

2. Build spike:
- Implement DB introspection for one target DB and produce canonical graph.

3. UX prototype:
- Click-through wizard prototype with 5 pilot users.

4. Technical ADRs:
- Decide canvas stack (`xyflow + elkjs` vs alternatives).

5. CI gates:
- Add mapping contract tests and golden fixtures to pipeline.

