# Epic MSV2-E6 - QA Hardening, Pilot, Release

Objective: Validate product fitness with users and release safely.
Target sprints: S7-S8

| Story ID | Story | Pts | Acceptance Criteria | Depends On |
|---|---|---:|---|---|
| MSV2-042 | Expand golden fixtures for large/ambiguous schemas | 5 | Fixtures cover at least 3 domains and edge ambiguity cases | MSV2-011, MSV2-015 |
| MSV2-043 | End-to-end test suite for full mapping journey | 8 | CI e2e covers source -> publish -> XFEB handoff | MSV2-026, MSV2-037 |
| MSV2-044 | Performance benchmark harness + budgets | 5 | Benchmark results stored and regressions fail CI gates | MSV2-030, MSV2-032 |
| MSV2-045 | Accessibility hardening and manual assistive-tech pass | 5 | Full keyboard and screen-reader checks pass | MSV2-027, MSV2-034 |
| MSV2-046 | Pilot rollout package and instrumentation review | 3 | Pilot checklist complete; telemetry dashboard live | MSV2-039, MSV2-043 |
| MSV2-047 | Bug bash and release candidate stabilization | 5 | Zero open P1/P2; known issues documented | MSV2-043, MSV2-046 |
| MSV2-048 | Production release and post-launch review | 2 | Go-live signed off; 2-week follow-up report delivered | MSV2-047 |
