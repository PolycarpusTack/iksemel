# XSLT Golden Tests

This project includes a fixture-based XSLT regression suite at:

- `src/engine/generation/xslt-golden.test.ts`

Golden files are stored in:

- `src/engine/generation/golden/`

## Purpose

Detect unintended output changes in generated XSLT for core formats by
comparing current generator output to committed fixtures.

## Commands

- Verify goldens:
  - `npm run test:golden`
- Regenerate goldens intentionally:
  - `npm run test:golden:update`

## Workflow

1. Make generator changes.
2. Run `npm run test:golden`.
3. If output changes are expected, run `npm run test:golden:update`.
4. Review fixture diffs carefully and commit only intentional changes.
