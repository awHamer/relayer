---
'@relayerjs/core': minor
'@relayerjs/drizzle': minor
---

Class-based entity model with decorator-driven computed and derived fields.

New API:

- `createRelayerEntity(schema, 'tableName')` creates a typed base class
- `@Entity.computed({ resolve })` decorator for computed fields
- `@Entity.derived({ query, on, shape? })` decorator for derived fields
- `createDrizzleEntities(schema)` batch helper to create all entity classes at once

Entity classes are the single source of truth for the data model. TypeScript types come from property declarations, not from `valueType` config.

The old functional config `{ fields: { name: { type: FieldType.Computed, valueType: 'string', ... } } }` is no longer supported. Use entity classes with decorators instead.
