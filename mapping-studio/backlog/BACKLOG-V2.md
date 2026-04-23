# Mapping Studio Implementation Backlog (V2)

Date: 2026-02-17
Scope: Convert v2 design + plan into execution-ready epics/issues

## 1. Epic Sequence

| Order | Epic ID | Epic | Target Sprint | Depends On |
|---|---|---|---|---|
| 1 | MSV2-E1 | Contracts, Migration, Core Mapping Engine | S1-S2 | - |
| 2 | MSV2-E2 | Source Ingestion (DB/XSD/XML) + Provenance | S1-S3 | MSV2-E1 (partial) |
| 3 | MSV2-E3 | Guided Wizard UX + Recommendations | S3-S4 | MSV2-E1, MSV2-E2 |
| 4 | MSV2-E4 | Canvas, Auto-layout, Schema Preview | S5-S6 | MSV2-E3 |
| 5 | MSV2-E5 | Persistence, Security, Observability | S6-S7 | MSV2-E3 |
| 6 | MSV2-E6 | QA Hardening, Pilot, Release | S7-S8 | MSV2-E4, MSV2-E5 |

## 2. Milestone Mapping

| Milestone | Epics Required | Exit Criteria |
|---|---|---|
| M1 Foundation | E1 + E2 (core stories) | Contract tests green, schema round-trip works |
| M2 Guided MVP | E3 + E2 (remaining) | End-to-end wizard to XFEB handoff |
| M3 Robustness | E4 + E5 (partial) | Large-schema performance + ambiguity diagnostics |
| M4 Production | E5 + E6 | Security/ops complete, pilot sign-off |

## 3. Global Definition of Done Additions

1. Every story updates or confirms tests.
2. New contract fields have migration notes.
3. User-facing errors include a next action.
4. Features remain usable without canvas (keyboard/panel path).
5. Telemetry added for new critical steps and failures.

## 4. Dependency Critical Path

1. `MSV2-001` -> `MSV2-005` -> `MSV2-012` -> `MSV2-017` -> `MSV2-030`
2. `MSV2-007` -> `MSV2-013` -> `MSV2-021` -> `MSV2-031`

## 5. Risk-Driven Priority Overrides

- If DB schema quality is poor in pilot data, pull forward `MSV2-015` (ambiguity diagnostics).
- If performance fails benchmark early, pull forward `MSV2-024`/`MSV2-025` before canvas enhancements.
- If compliance constraints appear, pull forward `MSV2-028` (secret handling) and `MSV2-029` (audit telemetry).
