---
'@relayerjs/core': patch
'@relayerjs/drizzle': patch
---

feat(core): add `SelectResult` and `DotPaths` utility types
feat(drizzle): infer `findMany`/`findFirst` return type from `select`, add `EntityWithRelations` type, deduplicate dot path types via core's `DotPaths`
