# Epic MSV2-E5 - Persistence, Security, Observability

Objective: Make mappings durable, safe, and operable in production.
Target sprints: S6-S7

| Story ID | Story | Pts | Acceptance Criteria | Depends On |
|---|---|---:|---|---|
| MSV2-035 | Local draft persistence + auto-save strategy | 3 | Auto-save recovers latest valid draft after refresh | MSV2-019 |
| MSV2-036 | Mapping history (version list, diff, rollback) | 5 | Rollback creates a new head version, preserves audit trail | MSV2-003 |
| MSV2-037 | Server persistence API integration contract | 5 | Save/load/list endpoints integrated behind repository interface | MSV2-035 |
| MSV2-038 | Secret-safe DB connectivity model (backend broker) | 8 | No raw DB credentials persisted client-side | MSV2-013 |
| MSV2-039 | Structured telemetry for funnel + failures | 3 | Metrics for step completion, drop-offs, error codes | MSV2-019, MSV2-026 |
| MSV2-040 | Audit events for publish/export/version rollback | 3 | Audit entries include actor/time/action/version id | MSV2-036 |
| MSV2-041 | Operational docs: runbook, migration, rollback | 2 | Docs reviewed and executable in staging rehearsal | MSV2-037, MSV2-040 |
