# @relayerjs/nestjs-common

## 0.0.4

### Patch Changes

- 07b3102: - `drizzle`: guard relation types when `TableRelationKeys` widens to `string`
  - `nestjs-common`: `RelayerModule.forRootAsync` now provides and exports `RELAYER_BASE_URL`
  - `nestjs-common`: validation error message includes per-error paths instead of bare "Validation failed"
  - `nestjs-crud`: `handleFindById` honors `?select=` query param (fallback to `findById.defaults.select`)
- Updated dependencies [07b3102]
  - @relayerjs/drizzle@0.7.4

## 0.0.3

### Patch Changes

- d814f39: Use `mergeWhere` from `@relayerjs/core` instead of local implementation. No behavior change, internal refactor only.

## 0.0.2

### Patch Changes

- f0c4822: Initial release: shared NestJS utilities extracted from nestjs-crud
