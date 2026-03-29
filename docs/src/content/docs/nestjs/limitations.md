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

Cursor pagination (`pagination: 'cursor'`) fetches order fields with `$raw` to preserve full database precision. This avoids the JS `Date` millisecond truncation that previously caused skipped or duplicated items with high-precision timestamps.

No workaround is needed -- cursor fields are automatically fetched as raw strings and stored in the cursor token with full precision.

## Entity types and relations

Entity classes created with `createRelayerEntity(schema, 'posts')` include scalar and computed/derived fields but not relation fields by default.

To get full relation-aware types (with autocomplete for `entity.comments`, `entity.author.fullName`, etc.), use the entity map pattern with `TEntities` generic:

```ts
// Define entity map
export const entities = { users: UserEntity, posts: PostEntity, comments: CommentEntity };
export type EM = typeof entities;

// Service with relation-aware types
class PostsService extends RelayerService<PostEntity, EM> { ... }

// Model<PostEntity, EM> includes: id, title, ..., author, comments (with nested types)
```

`Model<TEntity, TEntities>` resolves relation fields automatically from the Drizzle schema. This works in services, hooks, dto mappers, and controller config (via `@CrudController<PostEntity, EM>`).

## Roadmap

- Stable cursor pagination (requires `@relayerjs/drizzle` patch)
- Swagger for API documentation
- API endpoints for linking m2m, one2m relations
- Better integration with Relayer context object
