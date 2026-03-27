---
'@relayerjs/core': patch
'@relayerjs/drizzle': patch
---

- Fix count() returning string instead of number on PostgreSQL (bigint cast)
- Add `mode: 'insensitive'` for `contains`, `startsWith`, `endsWith` operators
- Add `$raw` select modifier for raw database values without JS type coercion
