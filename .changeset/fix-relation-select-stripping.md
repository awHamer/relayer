---
'@relayerjs/drizzle': patch
---

- Fix nested relation timestamps returned as raw PG strings instead of Date objects (apply `mapFromDriverValue` in SQL limit path)
- Fix nested relation select not filtering columns when using SQL limit optimization (`$limit`)
- Fix cursor pagination leaking internally-added fields (orderBy/id) into response data
- Handle `relation: true` and `{ $limit: N }` (no explicit fields) correctly — return all scalar columns
