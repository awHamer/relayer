---
title: JSON Filtering
description: Transparent nested path queries on JSON columns with auto type casting.
---

Relayer supports transparent filtering on JSON/JSONB columns. You write nested object filters that look like your JSON structure, and Relayer translates them into dialect-specific JSON path queries.

## Basic JSON filtering

Given a `metadata` column typed as `{ role: string; level: number }`:

```ts
const admins = await r.users.findMany({
  where: {
    metadata: { role: 'admin' },
  },
});
```

This generates (PostgreSQL):

```sql
WHERE metadata->>'role' = 'admin'
```

## Operators on JSON fields

All standard operators work on JSON leaf values:

```ts
const highLevel = await r.users.findMany({
  where: {
    metadata: { level: { gte: 5 } },
  },
});
```

Relayer detects the type of the comparison value and applies the correct SQL cast:

- **String values** -- compared as text (no cast)
- **Numeric values** -- cast to numeric (`::numeric` on PG, `CAST(... AS DECIMAL)` on MySQL, `CAST(... AS REAL)` on SQLite)
- **Boolean values** -- cast to boolean

## Deeply nested JSON

Filtering works at any nesting depth:

```ts
const darkTheme = await r.users.findMany({
  where: {
    metadata: {
      settings: { theme: { contains: 'dark' } },
    },
  },
});
```

Generates:

```sql
-- PostgreSQL
WHERE metadata->'settings'->>'theme' LIKE '%dark%'
```

## Combining multiple JSON conditions

Multiple conditions on the same JSON column are ANDed:

```ts
const powerAdmins = await r.users.findMany({
  where: {
    metadata: {
      role: 'admin',
      level: { gte: 8 },
    },
  },
});
```

```sql
WHERE metadata->>'role' = 'admin' AND (metadata->>'level')::numeric >= 8
```

## NULL checks on JSON fields

Check if a JSON key is null (inside the JSON) or if the entire column is null:

```ts
// JSON key is null (role is null inside the JSON object)
await r.users.findMany({
  where: { metadata: { role: { isNull: true } } },
});

// Entire column is null
await r.users.findMany({
  where: { metadata: { isNull: true } },
});

// Column is not null
await r.users.findMany({
  where: { metadata: { isNotNull: true } },
});
```

## Ordering by JSON paths

`orderBy` supports dot-notation for JSON columns -- the same paths you use in `where`:

```ts
const users = await r.users.findMany({
  orderBy: { field: 'metadata.role', order: 'asc' },
});
```

Nested paths work too:

```ts
const users = await r.users.findMany({
  orderBy: { field: 'metadata.settings.theme', order: 'desc' },
});
```

The `field` value is type-safe -- TypeScript infers valid JSON paths from your column's `$type<>()` definition, up to 4 levels of nesting.

:::note
JSON path ordering compares values as text. If you need numeric ordering on a JSON field (e.g., sorting by `metadata.level`), define a [computed field](/computed-fields/) with an explicit numeric cast instead.
:::

## Dialect differences

JSON path syntax varies by dialect:

| Feature       | PostgreSQL       | MySQL                   | SQLite                       |
| ------------- | ---------------- | ----------------------- | ---------------------------- |
| Path operator | `->>'key'`       | `->>'$.key'`            | `json_extract(col, '$.key')` |
| Numeric cast  | `::numeric`      | `CAST(... AS DECIMAL)`  | `CAST(... AS REAL)`          |
| Boolean cast  | `::boolean`      | `CAST(... AS UNSIGNED)` | `CAST(... AS INTEGER)`       |
| Nested path   | `col->'a'->>'b'` | `col->>'$.a.b'`         | `json_extract(col, '$.a.b')` |

These differences are handled automatically -- you write the same filter syntax regardless of dialect.
