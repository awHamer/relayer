---
title: 'NestJS: Known Limitations'
description: Current limitations and workarounds for relation loading, cursor pagination, and performance.
---

## Relation row limits (`$limit`)

When you use `$limit` to cap relation rows, the strategy depends on what fields are in the nested select.

### Scalar fields only -- SQL-level limiting

If your relation select contains only scalar columns (no computed or derived fields), Relayer uses `ROW_NUMBER()` in SQL:

```sql
SELECT "id", "content", "post_id", "author_id"
FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY "post_id") as "__rn"
  FROM "comments"
  WHERE "post_id" IN (1, 2, 3)
) "__sub"
WHERE "__rn" <= 5
```

This is efficient -- the database handles the per-parent limiting, only the needed rows are returned.

### Computed or derived fields -- JS-level limiting

When the relation select includes computed fields (`@Entity.computed`) or derived fields (`@Entity.derived`), SQL-level limiting is not possible -- these fields require Drizzle's query builder with custom SQL expressions that can't be wrapped in a `ROW_NUMBER()` subquery.

In this case, Relayer falls back to loading **all matching rows** from the database and slicing per-parent in JavaScript:

```ts
// All comments loaded, then sliced to 5 per post in JS
select: {
  comments: { $limit: 5, id: true, content: true, upperContent: true }
  //                                                ^^^^^^^^^^^^
  //                                                computed field -> JS fallback
}
```

**Performance impact:** For large datasets (thousands of child records per parent), the JS fallback loads all rows into memory before slicing. This can cause:

- High memory usage
- Slow response times
- Database load from transferring unnecessary rows

**Recommendations:**

- Avoid computed/derived fields in limited relation selects when working with large datasets
- Use a [nested resource endpoint](/nestjs/configuration#nested-resources) instead: `GET /posts/5/comments?limit=5` runs a direct query with SQL LIMIT
- Set `defaultRelationLimit` globally to prevent accidental full-table loads

### SQLite

SQLite (better-sqlite3) always uses JS-level limiting regardless of field types, because the driver lacks async `execute()` support for raw SQL.

## Cursor pagination

Cursor pagination (`pagination: 'cursor_UNSTABLE'`) has a known issue with timestamp precision.

### The problem

PostgreSQL stores timestamps with microsecond precision (6 decimal places):

```
2025-01-15 10:30:00.157432
```

JavaScript `Date` only supports millisecond precision (3 decimal places):

```
2025-01-15T10:30:00.157Z   (lost: 432)
```

When the cursor stores a `Date` value and uses it for equality comparison on the next page request, the comparison can fail:

```sql
-- Cursor value (from JS Date, ms precision)
WHERE "created_at" = '2025-01-15 10:30:00.157000'

-- Actual value in PG (μs precision)
-- '2025-01-15 10:30:00.157432'
-- These are NOT equal -> rows skipped
```

### When it matters

This only affects cursor pagination when:

1. Sorting by a timestamp field (e.g., `createdAt`)
2. Multiple records share the same millisecond-precision timestamp
3. The cursor lands exactly on such a record

In practice, the ID tiebreaker (always added automatically) makes this rare -- two records must have the exact same millisecond timestamp AND be adjacent in sort order.

### When it doesn't matter

- Sorting by numeric or string fields (IDs, titles, etc.)
- Timestamps with `timestamp(3)` precision in your schema (max 3 decimal places = ms precision)
- Tables where records rarely share the same millisecond timestamp

### Workaround

Add a computed field that extracts the timestamp as a text string with full precision, and sort by it:

```ts
const PostBase = createRelayerEntity(schema, 'posts');

export class PostEntity extends PostBase {
  @PostBase.computed({
    resolve: ({ table, sql }) => sql`${table.createdAt}::text`,
  })
  createdAtRaw!: string;
}
```

```ts
defaults: {
  orderBy: { field: 'createdAtRaw', order: 'desc' },
}
```

String comparison preserves full PostgreSQL precision. The cursor stores and compares strings, avoiding the JS Date precision loss entirely.

### Future fix

This will be resolved when cursor logic moves to Relayer core (ORM level), where it has access to Drizzle's `sql` template and can extract cursor values with full database precision.

## Entity types and relations

`createRelayerEntity(schema, 'posts')` currently includes only scalar columns in the TypeScript type. Relation fields (`comments`, `author`, etc.) are loaded at runtime but not reflected in the entity class type.

This means:

- No autocomplete for `entity.comments` in DtoMapper, hooks, or services
- Relation data requires `as` casts: `(entity as PostEntity & { comments: Comment[] }).comments`
- `select` config accepts relation names but without type checking

This is tracked for a fix in Relayer core. Once resolved, entity types will include optional relation fields derived from the Drizzle schema.
