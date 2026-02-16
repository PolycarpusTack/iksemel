# XFEB Coding Conventions

## File Structure

```
src/
  engine/           # Core logic — no React imports allowed
    parser/         # XSD parsing
    selection/      # Selection state management
    analysis/       # Payload estimation, validation
    generation/     # Filter XML, XSLT, Report Definition generation
  components/       # React components
    primitives/     # Base UI components (Button, Input, Select, Checkbox)
    tree/           # Schema tree explorer
    export/         # Export design panel
    package/        # Package configuration
    shared/         # Shared layout and utility components
  types/            # Shared TypeScript type definitions
  utils/            # Pure utility functions
  styles/           # Design tokens and global styles
  test/             # Test setup and shared test utilities
  assets/           # Static assets
```

## Naming

- **Files:** PascalCase for components (`Button.tsx`), camelCase for utilities and modules (`xml.ts`)
- **CSS Modules:** Same name as component (`Button.module.css`)
- **Test files:** Same name with `.test.ts` suffix (`xml.test.ts`)
- **Types:** PascalCase for interfaces and type aliases (`SchemaNode`, `SelectionState`)
- **Constants:** SCREAMING_SNAKE_CASE for true constants (`UNSAFE_XPATH_FUNCTIONS`)
- **Functions:** camelCase (`escXml`, `parseXSD`, `validateXPath`)

## TypeScript

- **Strict mode** — no `any` escapes unless documented in an ADR
- **Readonly** types for all data structures flowing through the system
- **Explicit interfaces** for component props (no inline types)
- **Barrel exports** via `index.ts` in each module directory

## Dependency Direction

```
engine → types ← components
           ↑
         utils
```

- Engine modules must NEVER import from `components/`
- Components may import from `engine/`, `types/`, and `utils/`
- Engine modules may import from `types/` and `utils/`
- No circular dependencies (enforced via madge)

## Component Patterns

- **CSS Modules** for all styles — no inline styles in production code
- **Design tokens** for all visual values — no hardcoded colours/spacing
- **`React.memo`** for tree node components with custom equality
- **`useReducer`** for complex state (selection, column management)
- Component files must not exceed 200 lines — split into sub-components
- Props typed with explicit interfaces, not inline types

## Testing

- **Unit tests:** Vitest + React Testing Library
- **Coverage targets:** 90%+ for `utils/` and `engine/`, 80%+ for `components/`
- **No `.skip` tests** in committed code
- **No snapshot-only tests** without meaningful assertions
- **E2E tests:** Playwright across Chrome, Firefox, Edge

## Accessibility

- ARIA roles on all interactive elements
- Keyboard navigation support for all UI
- Colour-independent state indication (shape differs per state)
- `prefers-reduced-motion` respected
