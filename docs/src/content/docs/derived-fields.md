---
title: Derived Fields
description: Automatic subquery JOINs for aggregations and cross-table computations with scalar and object-type values.
---

Derived fields are subqueries automatically joined to the main query. They are useful for aggregations, cross-table computations, and any value that comes from a related table.

## Defining derived fields

```ts
import { createRelayerDrizzle, FieldType } from '@relayerjs/drizzle';

const r = createRelayerDrizzle({
  db,
  schema,
  entities: {
    users: {
      fields: {
        postsCount: {
          type: FieldType.Derived,
          valueType: 'number',
          query: ({ db, schema: s, sql }) =>
            db
              .select({ postsCount: sql`count(*)::int`, userId: s.posts.authorId })
              .from(s.posts)
              .groupBy(s.posts.authorId),
          on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
        },
      },
    },
  },
});
```

Each derived field requires:

| Property    | Description                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `type`      | Must be `FieldType.Derived`                                                                         |
| `valueType` | Scalar (`'number'`, `'string'`, etc.) or object (`{ totalAmount: 'string', orderCount: 'number' }`) |
| `query`     | A function that builds a Drizzle subquery                                                           |
| `on`        | A function that defines the JOIN condition                                                          |

## The query function

The `query` function receives `{ db, schema, sql, context }` and must return a Drizzle query builder. The selected columns must include:

- The **value column(s)** to be exposed as the derived field
- A **join key** column used in the `on` condition

```ts
query: ({ db, schema: s, sql }) =>
  db
    .select({
      postsCount: sql`count(*)::int`,   // value column
      userId: s.posts.authorId,          // join key
    })
    .from(s.posts)
    .groupBy(s.posts.authorId),
```

## The on function

The `on` function receives `{ parent, derived, eq }` and returns a join condition:

```ts
on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
```

- **`parent`** -- column references for the main table
- **`derived`** -- column references for the subquery
- **`eq`** -- the Drizzle `eq` function

## Scalar derived fields

When `valueType` is a scalar type, the field resolves to a single value:

```ts
postsCount: {
  type: FieldType.Derived,
  valueType: 'number',
  query: ({ db, schema: s, sql }) =>
    db
      .select({ postsCount: sql`count(*)::int`, userId: s.posts.authorId })
      .from(s.posts)
      .groupBy(s.posts.authorId),
  on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
},
```

```ts
const users = await r.users.findMany({
  select: { id: true, firstName: true, postsCount: true },
});
// [{ id: 1, firstName: 'John', postsCount: 3 }, ...]
```

## Object-type derived fields

When `valueType` is an object, the field resolves to a nested object. Sub-fields in the subquery **must be prefixed** with `fieldName_`:

```ts
orderSummary: {
  type: FieldType.Derived,
  valueType: { totalAmount: 'string', orderCount: 'number' },
  query: ({ db, schema: s, sql }) =>
    db
      .select({
        orderSummary_totalAmount: sql`COALESCE(sum(${s.orders.total}), 0)::text`,
        orderSummary_orderCount: sql`count(*)::int`,
        userId: s.orders.userId,
      })
      .from(s.orders)
      .groupBy(s.orders.userId),
  on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
},
```

You can select individual sub-fields:

```ts
const users = await r.users.findMany({
  select: { id: true, orderSummary: { totalAmount: true } },
});
// [{ id: 1, orderSummary: { totalAmount: '5000' } }, ...]
```

Or select the entire object:

```ts
const users = await r.users.findMany({
  select: { id: true, orderSummary: true },
});
// [{ id: 1, orderSummary: { totalAmount: '5000', orderCount: 3 } }, ...]
```

### Filtering and sorting by object sub-fields

Object-type derived fields support type-safe dot notation in `where` and `orderBy`:

```ts
const topSpenders = await r.users.findMany({
  select: { id: true, orderSummary: { totalAmount: true, orderCount: true } },
  where: { orderSummary: { orderCount: { gte: 1 } } },
  orderBy: { field: 'orderSummary.totalAmount', order: 'desc' }, // type-safe dot notation! 🎉
});
```

## Deferred vs eager loading

Relayer automatically decides how to load derived fields:

- **Deferred** -- when the derived field is only in `select`, it is loaded via a separate batch query after the main query. One extra query per derived field, but the main query stays simple.
- **Eager** -- when the derived field is used in `where` or `orderBy`, it is joined via LEFT JOIN in the main query so that filtering and sorting work correctly.

This optimization is automatic -- you do not need to configure it.

### Example: deferred (select only)

```ts
// postsCount is only in select -> deferred batch query
const users = await r.users.findMany({
  select: { id: true, postsCount: true },
});
```

Main query: `SELECT id FROM users`
Batch query: `SELECT id, postsCount FROM users LEFT JOIN (...) WHERE id IN (1, 2, 3)`

### Example: eager (used in where)

```ts
// orderSummary used in where -> eager LEFT JOIN
const users = await r.users.findMany({
  select: { id: true, orderSummary: { totalAmount: true } },
  where: { orderSummary: { orderCount: { gte: 1 } } },
});
```

Generates a single query with LEFT JOIN:

```sql
SELECT users.id, derived."orderSummary_totalAmount"
FROM users
LEFT JOIN (
  SELECT COALESCE(sum(total), 0)::text AS "orderSummary_totalAmount",
         count(*)::int AS "orderSummary_orderCount",
         user_id
  FROM orders GROUP BY user_id
) derived ON users.id = derived.user_id
WHERE derived."orderSummary_orderCount" >= 1
```

## Derived fields with context

Like computed fields, derived fields can access per-query context:

```ts
recentOrderCount: {
  type: FieldType.Derived,
  valueType: 'number',
  query: ({ db, schema: s, sql, context }) =>
    db
      .select({ recentOrderCount: sql`count(*)::int`, userId: s.orders.userId })
      .from(s.orders)
      .where(sql`${s.orders.createdAt} > ${context.since}`)
      .groupBy(s.orders.userId),
  on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
},
```
