# @relayerjs/nestjs-graphql

## 0.2.0

### Minor Changes

- 6d20380: - Three pagination modes: `cursor` (flat items + pageInfo, default), `offset` (limit/offset), `cursor-edges` (Relay-style connections)
  - Relation mutations for many-to-many relations: `add{Relation}To{Entity}`, `remove{Relation}From{Entity}`, `set{Relation}On{Entity}`
  - Extra pivot column support via `include` option on relation config
  - Shared `RelationIdInput` for remove mutations, per-relation input with typed extras for add/set
  - Auto-enqueue relation target entities - nested relation types resolve without requiring their own `@GqlResolver`
  - `Pagination` const export for type-safe mode selection
  - Refactored all schema builders to be idempotent (prevents duplicate field errors with auto-enqueue)

## 0.1.0

### Minor Changes

- d82ddf5: Initial release: code-first GraphQL CRUD for NestJS with auto-generated schemas, dual pagination, filtering, and aggregation
