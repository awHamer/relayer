---
title: Basic Queries
description: findMany, findFirst, select, where, orderBy, limit, offset, and logical operators.
---

## findMany

Returns an array of records matching the query.

```ts
const users = await r.users.findMany({
  select: { id: true, firstName: true, email: true },
  where: { email: { contains: '@example.com' } },
  orderBy: { field: 'firstName', order: 'asc' },
  limit: 10,
  offset: 0,
});
```

All options are optional. Without `select`, all scalar columns are returned. Without `where`, all rows are returned.

## findFirst

Returns a single record or `null`.

```ts
const user = await r.users.findFirst({
  where: { id: 1 },
});
// { id: 1, firstName: 'John', lastName: 'Doe', email: '...', ... } | null
```

`findFirst` accepts the same options as `findMany` except `limit` and `offset`.

## select

Controls which fields are returned. Set fields to `true` to include them.

```ts
const users = await r.users.findMany({
  select: { id: true, firstName: true },
});
// [{ id: 1, firstName: 'John' }, ...]
```

You can select:

- **Scalar columns** -- `{ id: true, email: true }`
- **Computed fields** -- `{ fullName: true }`
- **Derived fields** -- `{ postsCount: true }` or `{ orderSummary: { totalAmount: true } }`
- **Relations** -- `{ posts: { id: true, title: true } }` (see [Relations](/relations/))

The result type is inferred from the select -- you only get the fields you ask for.

![select autocomplete showing scalar, computed, derived, and relation fields](/select-autocomplete.png)

## where

Filters records. Accepts field names with operator objects, or shorthand equality.

```ts
// Shorthand equality
const users = await r.users.findMany({
  where: { firstName: 'John' },
});

// Operator object
const users = await r.users.findMany({
  where: { email: { contains: '@gmail.com' } },
});

// Multiple conditions (implicit AND)
const users = await r.users.findMany({
  where: {
    firstName: 'John',
    email: { contains: '@example.com' },
  },
});
```

See [Operators](/operators/) for all available filter operators.

## AND / OR / NOT

Combine conditions with logical operators:

```ts
await r.users.findMany({
  where: {
    OR: [{ firstName: 'John' }, { firstName: 'Jane' }],
  },
});

await r.users.findMany({
  where: {
    AND: [{ role: 'admin' }, { active: true }],
  },
});

await r.users.findMany({
  where: {
    NOT: { email: { contains: 'spam' } },
  },
});
```

They can be nested:

```ts
await r.users.findMany({
  where: {
    OR: [{ firstName: 'John' }, { AND: [{ role: 'admin' }, { active: true }] }],
    NOT: { email: { contains: 'spam' } },
  },
});
```

## $raw

Escape hatch for custom SQL in `where`:

```ts
await r.users.findMany({
  where: {
    $raw: ({ table, sql }) =>
      sql`${table.firstName} ILIKE ${'%john%'} OR ${table.lastName} ILIKE ${'%doe%'}`,
  },
});
```

The `$raw` function receives `{ table, sql }` -- the same helpers available in computed field resolvers.

## orderBy

Sort results by any field -- scalar, computed, derived, relation, or JSON path.

```ts
// Scalar field
const users = await r.users.findMany({
  orderBy: { field: 'firstName', order: 'asc' },
});

// Computed field
const users = await r.users.findMany({
  orderBy: { field: 'fullName', order: 'desc' },
});

// Derived field with dot notation
const users = await r.users.findMany({
  orderBy: { field: 'orderSummary.totalAmount', order: 'desc' },
});

// Relation field -- automatic LEFT JOIN
const posts = await r.posts.findMany({
  orderBy: { field: 'author.firstName', order: 'asc' },
});

// JSON path -- dialect-specific extraction
const users = await r.users.findMany({
  orderBy: { field: 'metadata.role', order: 'asc' },
});

// Nested JSON path
const users = await r.users.findMany({
  orderBy: { field: 'metadata.settings.theme', order: 'desc' },
});

// Multiple fields (array)
const posts = await r.posts.findMany({
  orderBy: [
    { field: 'author.firstName', order: 'asc' },
    { field: 'title', order: 'desc' },
  ],
});
```

**Relation ordering** generates a `LEFT JOIN` on the related table. If multiple `orderBy` entries reference the same relation, the join is added only once.

**JSON path ordering** uses dialect-specific JSON extraction (`->>'key'` on PostgreSQL, `json_extract()` on SQLite, `->>'$.key'` on MySQL). Values are compared as text. For numeric ordering on JSON fields, use a [computed field](/computed-fields/) instead.

The `field` value is fully type-safe -- TypeScript will autocomplete valid field names including relation columns, JSON paths, and dot-notation paths for object-type derived fields.

![orderBy autocomplete for JSON paths](/sort-autocomplete.png)

## limit and offset

Paginate results:

```ts
const page = await r.users.findMany({
  limit: 20,
  offset: 40, // skip first 40 records (page 3)
});
```

## context

Pass per-query context to computed and derived field resolvers:

```ts
const users = await r.users.findMany({
  select: { id: true, isMe: true },
  context: { currentUserId: 42 },
});
```

See [Context](/context/) for full details.
