# Mapping Studio Backlog (V2)

This folder contains the execution backlog derived from:
- `mapping-studio/SOLUTION-DESIGN-V2.md`
- `mapping-studio/DEVELOPMENT-PLAN-V2.md`

## Contents

- `BACKLOG-V2.md`: Master roadmap, sequencing, and dependencies
- `epics/MSV2-E1.md` through `epics/MSV2-E6.md`: Epic-level implementation backlog
- `issues/ISSUES-V2.md`: Issue-ready story list for tracking system import

## Planning Rules

- IDs are stable and should not be reused.
- Dependency format:
  - `blocks`: this item blocks another
  - `depends_on`: this item cannot start before listed items
- Story status lifecycle:
  - `todo` -> `in_progress` -> `in_review` -> `done`
- Completion criteria:
  - Story acceptance criteria met
  - Tests added/updated
  - No unresolved P1/P2 regressions introduced by the story
