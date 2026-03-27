# @relayerjs/core

## 0.3.1

### Patch Changes

- 6d6cf36: - Fix count() returning string instead of number on PostgreSQL (bigint cast)
  - Add `mode: 'insensitive'` for `contains`, `startsWith`, `endsWith` operators
  - Add `$raw` select modifier for raw database values without JS type coercion

## 0.3.0

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

## 0.2.1

### Patch Changes

- 571a3d0: feat(core): add `SelectResult` and `DotPaths` utility types
  feat(drizzle): infer `findMany`/`findFirst` return type from `select`, add `EntityWithRelations` type, deduplicate dot path types via core's `DotPaths`

## 0.2.0

### Minor Changes

- fba68f8: Class-based entity model with decorator-driven computed and derived fields.

  New API:
  - `createRelayerEntity(schema, 'tableName')` creates a typed base class
  - `@Entity.computed({ resolve })` decorator for computed fields
  - `@Entity.derived({ query, on, shape? })` decorator for derived fields
  - `createDrizzleEntities(schema)` batch helper to create all entity classes at once

  Entity classes are the single source of truth for the data model. TypeScript types come from property declarations, not from `valueType` config.

  The old functional config `{ fields: { name: { type: FieldType.Computed, valueType: 'string', ... } } }` is no longer supported. Use entity classes with decorators instead.

## 0.1.4

### Patch Changes

- 5544be7: Add `field()` helper to derived field query context for automatic column naming
