# @relayerjs/nestjs-crud

## 0.3.2

### Patch Changes

- 07b3102: - `drizzle`: guard relation types when `TableRelationKeys` widens to `string`
  - `nestjs-common`: `RelayerModule.forRootAsync` now provides and exports `RELAYER_BASE_URL`
  - `nestjs-common`: validation error message includes per-error paths instead of bare "Validation failed"
  - `nestjs-crud`: `handleFindById` honors `?select=` query param (fallback to `findById.defaults.select`)
- Updated dependencies [07b3102]
  - @relayerjs/drizzle@0.7.4
  - @relayerjs/nestjs-common@0.0.4

## 0.3.1

### Patch Changes

- ff9ca54: Internal: shared utilities now imported from @relayerjs/nestjs-common. No public API changes.

## 0.3.0

### Minor Changes

- 5e5ab99: - Add typed Context support across services, controllers and hooks. Override `buildContext` / `buildQueryContext` on the controller and the same typed context flows into hooks and into `getDefaultWhere` for row-level scoping on reads and writes

## 0.2.0

### Minor Changes

- 26602a3: - Add relation endpoints POST/DELETE/PUT `/:id/relations/:name` for connect/disconnect/set
  - Extended hooks for relations: `beforeRelation`, `afterRelation`
  - Swagger auto-generation for all CRUD and relation routes
  - Stable cursor pagination: `'cursor'` mode, deprecate `'cursor_UNSTABLE'`

### Patch Changes

- 44d2758: - Fix ParseIdPipe: validate int32 range (1..2147483647), reject floats, zero, negative
  - Fix handleUpdate: throw NotFoundException when entity not found (was returning `{ success: true }`)
- Updated dependencies [87e41f5]
  - @relayerjs/drizzle@0.6.1

## 0.1.2

### Patch Changes

- c2491e5: Move `@relayerjs/core` and `@relayerjs/drizzle` to peerDependencies with tilde ranges

## 1.0.0

### Patch Changes

- Updated dependencies [3d4c0a7]
  - @relayerjs/drizzle@0.6.0

## 0.1.1

### Patch Changes

- 4361439: Fix documentation URL in README

## 1.0.0

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
  - @relayerjs/drizzle@0.5.0
