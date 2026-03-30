---
'@relayerjs/nestjs-crud': minor
---

- Add relation endpoints POST/DELETE/PUT `/:id/relations/:name` for connect/disconnect/set
- Extended hooks for relations: `beforeRelation`, `afterRelation`
- Swagger auto-generation for all CRUD and relation routes
- Stable cursor pagination: `'cursor'` mode, deprecate `'cursor_UNSTABLE'`
