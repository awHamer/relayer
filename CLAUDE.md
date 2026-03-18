# Relayer

TypeScript library providing repository-like abstraction over Drizzle ORM with computed/derived fields and type-safe query DSL.

## Project Structure

- `packages/core/` — `@relayerjs/core` — ORM-agnostic types, contracts, DSL
- `packages/drizzle/` — `@relayerjs/drizzle` — Drizzle adapter implementation
- `examples/drizzle/` — Drizzle example with PG/MySQL/SQLite manual tests (not published)
- `examples/docker-compose.yml` — shared PG + MySQL containers for examples and tests

## Tech Stack

- pnpm workspaces (no turborepo yet)
- TypeScript 5.9+, strict mode
- tsup (build), vitest (tests)
- ESLint flat config, Prettier + @ianvs/prettier-plugin-sort-imports
- Drizzle ORM stable V1 (>=0.38.0, <1.0.0)
- Node.js >= 20

## Code Standards

- **Minimal comments** — only in genuinely tricky spots. Code should be self-explanatory.
- **Comments in English only.**
- **No `any`** — use proper generics, `unknown`, or type narrowing. `any` is acceptable only when Drizzle's own types force it and there is no viable alternative.
- **No over-engineering** — no premature abstractions, no dead code, no "just in case" utilities.
- **No unnecessary documentation files** — don't create README.md or docs unless explicitly asked.
- **Prefer `interface` over `type` for object shapes** — better TS performance and error messages.
- **Prefer explicit imports** — no wildcard `import *` unless re-exporting a schema.
- **No unicode arrows in comments** — use `->` instead of `→`. Keep comments ASCII-only.

## Naming Conventions

- Files: kebab-case (`where-builder.ts`)
- Types/Interfaces: PascalCase (`WhereBuilder`)
- Functions/variables: camelCase (`buildWhere`)
- Constants: camelCase or UPPER_SNAKE_CASE for true constants

## Package Publishing

- Scope: `@relayerjs`
- npm org created at npmjs.com
- Changesets for versioning (later phases)
