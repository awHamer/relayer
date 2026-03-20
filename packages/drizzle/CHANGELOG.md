# @relayerjs/drizzle

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
