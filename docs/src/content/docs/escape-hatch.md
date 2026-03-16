---
title: Escape Hatch
description: Access the underlying Drizzle instance when you need raw queries.
---

Sometimes you need to drop down to raw Drizzle queries for features that Relayer does not cover. The `$orm` property and `getOrm()` method give you direct access to the underlying Drizzle database instance.

## $orm

```ts
const db = r.$orm;

const result = await db.select().from(schema.users).where(eq(schema.users.id, 1));
```

## getOrm()

```ts
const db = r.getOrm();

const result = await db.select().from(schema.users).where(eq(schema.users.id, 1));
```

Both `$orm` and `getOrm()` return the same Drizzle instance passed to `createRelayerDrizzle`.

## When to use it

Use the escape hatch when you need:

- **Complex SQL** that cannot be expressed through the Relayer DSL
- **Raw SQL execution** (`db.execute(sql`...`)`)
- **Drizzle-specific features** not yet wrapped by Relayer (e.g., custom joins, CTEs, window functions)
- **Schema migrations** or DDL operations

## Example: custom join

```ts
const db = r.$orm;

const result = await db
  .select({
    userId: schema.users.id,
    userName: schema.users.firstName,
    orderTotal: schema.orders.total,
  })
  .from(schema.users)
  .innerJoin(schema.orders, eq(schema.users.id, schema.orders.userId))
  .where(gt(schema.orders.total, 1000));
```

## Example: raw SQL

```ts
const db = r.$orm;

const result = await db.execute(
  sql`SELECT * FROM users WHERE first_name ~* ${'^jo'}`,
);
```

## Mixing Relayer and raw Drizzle

You can freely mix Relayer queries with raw Drizzle queries in the same codebase. Relayer does not lock you in -- use it where it adds value, and drop down to Drizzle when you need full control.

```ts
// Use Relayer for standard CRUD with computed fields
const users = await r.users.findMany({
  select: { id: true, fullName: true, postsCount: true },
  where: { email: { contains: '@example.com' } },
});

// Use raw Drizzle for a complex analytical query
const db = r.$orm;
const analytics = await db.execute(
  sql`
    SELECT date_trunc('month', created_at) AS month,
           count(*) AS signups
    FROM users
    GROUP BY 1
    ORDER BY 1
  `,
);
```
