---
'@relayerjs/drizzle': patch
---

Aggregate results now return nested objects instead of flat underscore-separated keys.

- `_sum_total` -> `_sum: { total: 2000 }`
- `user_firstName` -> `user: { firstName: "Ihor" }`
- `_count` always returns `number`, not `string`
- All aggregate values coerced to `number`
- Added `having` support for filtering after GROUP BY
- Security: validate JSON path segments to prevent SQL injection via `sql.raw`
