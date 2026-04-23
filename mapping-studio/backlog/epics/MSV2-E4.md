# Epic MSV2-E4 - Canvas, Auto-layout, Schema Preview

Objective: Add visual modeling without sacrificing accessibility or determinism.
Target sprints: S5-S6

| Story ID | Story | Pts | Acceptance Criteria | Depends On |
|---|---|---:|---|---|
| MSV2-028 | Integrate canvas framework wrapper abstraction | 5 | Canvas layer decoupled from business state model | MSV2-019 |
| MSV2-029 | Entity nodes and relationship edges with type labels | 5 | Nodes/edges render from mapping model and update live | MSV2-028 |
| MSV2-030 | Auto-layout strategy (`elkjs` primary, fallback layout) | 8 | Non-overlapping layout for benchmark graph fixtures | MSV2-029 |
| MSV2-031 | Bidirectional sync: panel edits <-> canvas edits | 5 | Any change source updates shared reducer state | MSV2-028, MSV2-029 |
| MSV2-032 | Canvas interactions: connect, delete, multi-select, undo/redo | 8 | 30-op stress sequence preserves valid mapping state | MSV2-031 |
| MSV2-033 | Export canvas image and include thumbnail in mapping metadata | 3 | PNG/SVG export works at default and fit-to-view | MSV2-029 |
| MSV2-034 | Non-canvas equivalent controls for all critical actions | 3 | Every canvas action available via panel/keyboard path | MSV2-032 |
