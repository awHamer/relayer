# @relayerjs/nestjs-crud

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
