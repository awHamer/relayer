---
'@relayerjs/nestjs-crud': minor
---

- Add typed Context support across services, controllers and hooks. Override `buildContext` / `buildQueryContext` on the controller and the same typed context flows into hooks and into `getDefaultWhere` for row-level scoping on reads and writes
