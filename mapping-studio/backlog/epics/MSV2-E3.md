# Epic MSV2-E3 - Guided Wizard UX + Recommendations

Objective: Deliver a non-technical guided flow from source to publishable mapping.
Target sprints: S3-S4

| Story ID | Story | Pts | Acceptance Criteria | Depends On |
|---|---|---:|---|---|
| MSV2-019 | Wizard shell with step routing and resumable drafts | 5 | User can exit/re-enter and resume exact wizard state | MSV2-017 |
| MSV2-020 | Source selection step (`XSD`, `XML`, `Database`) | 3 | Source choice controls only valid downstream actions | MSV2-017 |
| MSV2-021 | Root selection step with explanation of ranking | 5 | Top candidates show score + explanation text | MSV2-004, MSV2-019 |
| MSV2-022 | Relationship confirmation step with ambiguity warnings | 5 | Users can accept/override suggested joins | MSV2-005, MSV2-015 |
| MSV2-023 | Field selection step with recommendations and quick presets | 5 | Recommended preset produces valid mapping without manual edits | MSV2-007 |
| MSV2-024 | Validation panel with actionable errors and "fix" navigation | 3 | Clicking an error takes user to exact fix location | MSV2-010 |
| MSV2-025 | Data shape preview + generated schema preview in wizard | 5 | Preview matches resulting canonical schema | MSV2-008, MSV2-024 |
| MSV2-026 | Publish step: save version + export schema snapshot (JSON + XSD) | 3 | New version persisted; export files generated | MSV2-003, MSV2-009 |
| MSV2-027 | A11y baseline for wizard flow | 3 | Keyboard-only full flow and zero serious axe violations | MSV2-019..MSV2-026 |
