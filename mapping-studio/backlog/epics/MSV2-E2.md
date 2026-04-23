# Epic MSV2-E2 - Source Ingestion (DB/XSD/XML) + Provenance

Objective: Ingest source structures and normalize into canonical graph with confidence signals.
Target sprints: S1-S3

| Story ID | Story | Pts | Acceptance Criteria | Depends On |
|---|---|---:|---|---|
| MSV2-012 | Implement `DatabaseSchemaProvider` contract and registry wiring | 5 | Provider available via registry; contract tests pass | MSV2-001 |
| MSV2-013 | Build DB introspection adapter (PK/FK/index/nullable/type metadata) | 8 | Fixture DB metadata mapped into canonical model correctly | MSV2-012 |
| MSV2-014 | Add source provenance metadata to all canonical nodes | 3 | `sourceType` and `provenance` present and consistent | MSV2-012 |
| MSV2-015 | Add confidence scoring + ambiguity diagnostics for inferred relationships | 5 | Low-confidence paths flagged with reasons and confidence score | MSV2-013 |
| MSV2-016 | Normalize XML sample and XSD ingestion output contracts | 3 | Unified result object shape across providers | MSV2-001 |
| MSV2-017 | Build source-to-mapping bootstrap pipeline | 8 | `source -> mapping draft` works for DB, XSD, XML sample | MSV2-004, MSV2-005, MSV2-012, MSV2-016 |
| MSV2-018 | Add provider-level telemetry and error taxonomy | 3 | Ingestion errors emit structured code + context payload | MSV2-012 |
