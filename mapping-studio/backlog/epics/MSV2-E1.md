# Epic MSV2-E1 - Contracts, Migration, Core Mapping Engine

Objective: Build deterministic mapping core and stable contracts.
Target sprints: S1-S2

| Story ID | Story | Pts | Acceptance Criteria | Depends On |
|---|---|---:|---|---|
| MSV2-001 | Define `MappingSpec` + entity/field/glossary types and Zod schemas | 5 | Contracts compile; valid fixtures parse; invalid fixtures return typed errors | - |
| MSV2-002 | Implement versioned migration loader for mapping documents | 3 | v1 fixtures load into latest shape; unknown fields preserved | MSV2-001 |
| MSV2-003 | Deterministic serializer/deserializer for stable diffs | 3 | Save-load-save output is byte-stable for same model | MSV2-001 |
| MSV2-004 | Root entity detector (score-based) | 5 | Top root matches expected on at least 5 fixture schemas | MSV2-001 |
| MSV2-005 | Relationship analyzer (1:1, 1:N, M:N, junction detection) | 8 | FK-based relationships fully detected on fixture pack | MSV2-001 |
| MSV2-006 | Business label generator with abbreviation dictionary | 5 | 25 label test cases pass, including domain abbreviations | MSV2-001 |
| MSV2-007 | Field recommender heuristic (PK, business name/date/code, required) | 3 | Recommended fields are deterministic and test-backed | MSV2-001 |
| MSV2-008 | `mappingToSchema()` canonical mapper | 5 | Output feeds existing XFEB selection/generation pipeline | MSV2-003, MSV2-005 |
| MSV2-009 | `mappingToXsd()` generator (baseline constraints) | 8 | Generates valid XSD for core fixtures; parser accepts round-trip | MSV2-008 |
| MSV2-010 | Mapping validator (orphans, duplicates, invalid joins, type mismatches) | 5 | 10 invalid fixtures produce expected error codes | MSV2-001, MSV2-005 |
| MSV2-011 | Contract test harness + golden fixture pack | 5 | >=90% coverage in mapping engine modules | MSV2-002..MSV2-010 |
