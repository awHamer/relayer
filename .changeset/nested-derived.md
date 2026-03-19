---
'@relayerjs/drizzle': patch
---

Nested derived/computed fields on relations

- select, where, orderBy and aggregate groupBy now resolve derived, computed and scalar fields on relation targets recursively
- Configurable `maxRelationDepth` option in `createRelayerDrizzle()` (default 3)
- `TEntities` propagated through EntitySelect, EntityWhere, EntityOrderBy for type-safe autocomplete on relation fields
- Query context propagates to all nested relation field resolvers
