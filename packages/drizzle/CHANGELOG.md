# @relayerjs/drizzle

## 0.5.0

### Minor Changes

- 840168e: ### @relayerjs/nestjs-crud (initial release)

  Full-featured NestJS CRUD integration for Relayer.
  - `RelayerModule` with `forRoot` / `forRootAsync` / `forFeature` registration
  - `RelayerService` base class with typed CRUD methods, service defaults (`getDefaultWhere`, `getDefaultOrderBy`, `getDefaultSelect`), and cross-entity access
  - `@CrudController` decorator with auto-generated routes (list, findById, create, update, delete, count, aggregate)
  - Route-level configuration: defaults, field whitelists, operator restrictions, pagination (offset and cursor), configurable search
  - `DtoMapper` abstract class with `toListItem` / `toSingleItem` / `toCreateInput` / `toUpdateInput`
  - `RelayerHooks` abstract class with fully typed lifecycle hooks (beforeCreate, afterFind, etc.)
  - Typed aggregate
  - Typed response envelopes: `ListResponse`, `CursorListResponse`, `DetailResponse`, `CountResponse`
  - Decorator targeting: apply NestJS decorators to specific CRUD routes
  - Validation: Zod and class-validator support
  - DI decorators: `@InjectRelayer`, `@InjectEntity`, `@InjectQueryService`
  - `EnvelopeInterceptor` and `RelayerExceptionFilter`
  - Query string parsing with `parseListQuery`

  ### @relayerjs/core
  - Export `SelectType` and `OrderByType` types
  - `WhereType`: support relation array fields as nested `WhereType` (not just `ArrayOperators`)

  ### @relayerjs/drizzle
  - Add `EntityModelFromInstance`, `EntityModelFromClass`, `EntityModelWithRelations`, `EntityInstanceWithRelations` types for NestJS service type inference
  - Add `InferModelFromEntity` helper type
  - Propagate `__entityKey` literal type through entity class statics
  - Move `InferEntityWhere` / `InferEntitySelect` / `InferEntityOrderBy` re-exports to `@relayerjs/core`

### Patch Changes

- Updated dependencies [840168e]
  - @relayerjs/core@0.3.0

## 0.4.6

### Patch Changes

- 571a3d0: feat(core): add `SelectResult` and `DotPaths` utility types
  feat(drizzle): infer `findMany`/`findFirst` return type from `select`, add `EntityWithRelations` type, deduplicate dot path types via core's `DotPaths`
- Updated dependencies [571a3d0]
  - @relayerjs/core@0.2.1

## 0.4.5

### Patch Changes

- c35d5d1: Fix per-parent $limit: use ROW_NUMBER() in SQL for scalar relations, JS slice fallback for computed/derived

## 0.4.4

### Patch Changes

- 3479a6b: Add `$limit` to relation select types for autocomplete support

## 0.4.3

### Patch Changes

- 3d9c690: Allow limit "many" relations:
  `defaultRelationLimit` in client config
  `$limit` in select for per-relation control (overrides default limit)

## 0.4.2

### Patch Changes

- 9ea97a0: Aggregate results now return nested objects instead of flat underscore-separated keys.
  - `_sum_total` -> `_sum: { total: 2000 }`
  - `user_firstName` -> `user: { firstName: "Ihor" }`
  - `_count` always returns `number`, not `string`
  - All aggregate values coerced to `number`
  - Added `having` support for filtering after GROUP BY
  - Security: validate JSON path segments to prevent SQL injection via `sql.raw`

## 0.4.1

### Patch Changes

- 56670db: SelectType, WhereType, DotPaths, OrderByType now work directly from entity class without InferModel. Relation operators renamed from $some/$every/$none/$exists to some/every/none/exists. Updated docs and type utilities.

## 0.4.0

### Minor Changes

- fba68f8: Class-based entity model with decorator-driven computed and derived fields.

  New API:
  - `createRelayerEntity(schema, 'tableName')` creates a typed base class
  - `@Entity.computed({ resolve })` decorator for computed fields
  - `@Entity.derived({ query, on, shape? })` decorator for derived fields
  - `createDrizzleEntities(schema)` batch helper to create all entity classes at once

  Entity classes are the single source of truth for the data model. TypeScript types come from property declarations, not from `valueType` config.

  The old functional config `{ fields: { name: { type: FieldType.Computed, valueType: 'string', ... } } }` is no longer supported. Use entity classes with decorators instead.

### Patch Changes

- Updated dependencies [fba68f8]
  - @relayerjs/core@0.2.0

## 0.3.1

### Patch Changes

- aabdaf7: Nested derived/computed fields on relations
  - select, where, orderBy and aggregate groupBy now resolve derived, computed and scalar fields on relation targets recursively
  - Configurable `maxRelationDepth` option in `createRelayerDrizzle()` (default 3)
  - `TEntities` propagated through EntitySelect, EntityWhere, EntityOrderBy for type-safe autocomplete on relation fields
  - Query context propagates to all nested relation field resolvers

## 0.3.0

### Minor Changes

- 0d2d6db: Add `findManyStream()` for MySQL streaming via async iterator

## 0.2.1

### Patch Changes

- 5544be7: Add `field()` helper to derived field query context for automatic column naming
- Updated dependencies [5544be7]
  - @relayerjs/core@0.1.4

## 0.2.0

### Minor Changes

- b2fa4d4: Add orderBy support for relation fields and JSON paths with full type safety
