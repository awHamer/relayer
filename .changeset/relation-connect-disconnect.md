---
'@relayerjs/drizzle': minor
---

Add `connect/disconnect/set` relation operations in `update()`:

- `one()` relations: `{ author: { connect: 2 } }` sets FK column, `{ disconnect: true }` sets to null
- `many()` relations via join table: `{ postTags: { connect: [1, 2] } }`, `{ disconnect: [3] }`, `{ set: [1, 2] }`
- `many()` with extra columns: `{ connect: [{ _id: 5, isPrimary: true }] }`
- Transaction-safe: many() ops wrapped in transaction (PG/MySQL)
- Mixed scalar + relation ops in single `update()` call
