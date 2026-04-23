# Mapping Studio - Solution Design (V2)

Date: 2026-02-17
Status: Proposed
Target: `mapping-studio` subproject of XFEB

## 1. Goal

Enable non-technical users to build report definitions from business terms instead of raw XSD/database structure.

Primary outcome:
- A user can create a valid report mapping in under 15 minutes without knowing tables, joins, XPath, or XSD.

## 2. Product Scope

In scope:
- Guided mapping experience from source schema to report-ready structure
- Canonical schema abstraction layer (source-agnostic)
- Reusable mapping templates per customer/domain
- Explainable relationship suggestions and field recommendations
- Validation, preview, and export of mapping outputs (including generated XSD snapshot)

Out of scope (v1):
- Full SQL editor for arbitrary queries
- Real-time collaborative multi-user editing
- Full lineage catalog across environments

## 3. Core Product Decisions

1. Source-agnostic core:
- Internally normalize all inputs to a canonical `SchemaNode` graph.
- Sources may include XSD, XML sample, and database introspection.

2. Guided UX first:
- Default path is wizard + recommendations, not free-form modeling.
- Advanced controls are progressive disclosure.

3. Mapping as primary artifact:
- Persist a versioned `MappingSpec`.
- Everything else is derived (tree, report config, XSD snapshot).

4. Database-first is valid:
- Yes, you can use database introspection instead of loading XSD and still produce equivalent report outputs.
- Constraint: inferred schemas may miss semantics normally encoded in curated XSD documentation/restrictions.

## 4. Target UX/CX

### 4.1 Main Journey

1. Choose source:
- `Upload XSD`, `Upload XML Sample`, `Connect Database`

2. Confirm business context:
- Pick domain template (e.g., Broadcast Schedule, Inventory, Billing)

3. Guided mapping wizard:
- Pick root business entity
- Confirm suggested related entities
- Choose recommended fields
- Review generated business labels

4. Validate and preview:
- Data shape preview
- Warning panel (missing keys, ambiguous joins, low-confidence inferences)

5. Publish mapping:
- Save version
- Export derived schema snapshot (JSON + XSD)
- Hand off to XFEB report builder

### 4.2 UX Requirements

- Every technical field must have a business label.
- Every join suggestion must show an explanation.
- Error messages must be actionable, with fix hints.
- Keyboard-only flow must be complete.

## 5. Architecture

## 5.1 Modules

1. Source Connectors:
- `XsdSchemaProvider`
- `XmlSampleProvider`
- `DatabaseSchemaProvider` (introspection + FK metadata)

2. Canonical Layer:
- Canonical schema graph (`SchemaNode[]`)
- Provenance metadata on each node

3. Mapping Engine:
- Root detection
- Relationship classifier
- Field recommender
- Label generator
- Mapper (`MappingSpec -> SchemaNode[]`)
- XSD generator (`MappingSpec -> XSD`)

4. Mapping Studio UI:
- Wizard shell
- Entity/relationship canvas
- Glossary/label editor
- Validation panel

5. Persistence:
- Local draft store
- Server API (optional in v1, required by v2 for team workflows)

## 5.2 Data Contracts

`MappingSpec` (persisted):
- `id`, `name`, `version`
- `source` (type, identifier, schemaHash)
- `rootEntityId`
- `entities[]` and `fields[]`
- `glossary[]`
- `layout` (canvas positions)
- `quality` (confidence, unresolvedWarnings)

`SchemaSnapshot` (derived):
- Canonical tree for XFEB runtime
- Generated XSD snapshot

## 6. Database vs XSD Equivalence

You can replace XSD ingestion with database ingestion if:
- Table/column metadata is complete
- PK/FK relationships are reliable
- Required business semantics are captured by mapping/glossary rules

Gaps to plan for:
- XSD documentation/comments are usually richer than DB schema
- Enumerations/pattern constraints may be absent in DB metadata
- XML-oriented cardinality hints may need heuristics

Mitigation:
- Add explicit business glossary and rule editor
- Add confidence scoring and review gate before publish

## 7. Extracting XSD from App or Database

Supported paths:

1. From application mapping:
- `MappingSpec -> canonical SchemaNode -> XSD generator`
- Best for client-facing export because labels and curated semantics are preserved

2. From database directly:
- Introspect schema -> canonical graph -> XSD generator
- Fast bootstrap, lower semantic fidelity

3. From existing report configs:
- Parse report definition/filter usage -> infer minimal required schema subset -> generate scoped XSD

Recommendation:
- Use path 1 for production output, path 2 for initial onboarding.

## 8. NFRs

Performance:
- 1,500 nodes + 2,500 edges open under 2 seconds on typical laptop.

Reliability:
- Auto-save every 5 seconds.
- Deterministic serialization for diffing.

Security:
- Secrets never stored in browser local storage.
- DB connectivity through backend proxy, not direct browser credentials.

Accessibility:
- WCAG 2.1 AA baseline.
- Non-canvas alternative must provide full functionality.

## 9. GitHub Repositories to Strengthen Robustness

Use as candidates, not mandatory dependencies.

1. `xyflow/xyflow` (React Flow):
- Role: interactive node/edge editor for mappings
- Link: https://github.com/xyflow/xyflow

2. `kieler/elkjs`:
- Role: automatic graph layout for readable entity maps
- Link: https://github.com/kieler/elkjs

3. `dagrejs/dagre`:
- Role: lighter DAG layout option for smaller graphs
- Link: https://github.com/dagrejs/dagre

4. `statelyai/xstate`:
- Role: robust wizard/canvas workflow state machines
- Link: https://github.com/statelyai/xstate

5. `colinhacks/zod`:
- Role: strict runtime validation for mapping contracts and migrations
- Link: https://github.com/colinhacks/zod

6. `prisma/prisma`:
- Role: stable DB introspection/metadata workflows on backend services
- Link: https://github.com/prisma/prisma

7. `knex/knex`:
- Role: SQL dialect abstraction and metadata querying utility
- Link: https://github.com/knex/knex

8. `xmldom/xmldom`:
- Role: consistent DOM parsing in Node-side tooling
- Link: https://github.com/xmldom/xmldom

## 10. Success Metrics

- 80% of pilot users complete mapping without developer assistance
- Median time-to-first-valid-mapping <= 15 minutes
- Mapping reuse rate >= 60% across reports in same customer domain
- Report generation failures caused by mapping issues < 3%

