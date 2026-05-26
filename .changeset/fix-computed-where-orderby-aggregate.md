---
'@relayerjs/drizzle': patch
---

`drizzle`: fix filtering, sorting and aggregation by computed fields. The resolved
computed map stores SQL aliased for `SELECT`, but Postgres rejects output aliases in
`WHERE`, and `ORDER BY`/aggregate paths mis-handled the alias too. Now:

- `WHERE` and `ORDER BY` unwrap the alias and inline the raw expression
- aggregate `groupBy` aliases the SQL expression so result rows are keyed by the field
- `findMany` resolves computed fields referenced only in `where`/`orderBy` (not just `select`)
