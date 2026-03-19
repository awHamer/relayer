# @relayerjs/drizzle

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
