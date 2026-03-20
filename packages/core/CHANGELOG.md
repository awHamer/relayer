# @relayerjs/core

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
