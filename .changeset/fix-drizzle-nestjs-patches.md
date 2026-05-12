---
'@relayerjs/drizzle': patch
'@relayerjs/nestjs-common': patch
'@relayerjs/nestjs-crud': patch
---

- `drizzle`: guard relation types when `TableRelationKeys` widens to `string`
- `nestjs-common`: `RelayerModule.forRootAsync` now provides and exports `RELAYER_BASE_URL`
- `nestjs-common`: validation error message includes per-error paths instead of bare "Validation failed"
- `nestjs-crud`: `handleFindById` honors `?select=` query param (fallback to `findById.defaults.select`)
