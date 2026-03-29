---
title: Mutations
description: Create, update, and delete records with type-safe data and filters.
---

## create

Insert a single record and return it:

```ts
const user = await r.users.create({
  data: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
});
// { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', ... }
```

The `data` object is typed based on the table's insert type from Drizzle (`$inferInsert`). Required columns must be provided; columns with defaults are optional.

## createMany

Insert multiple records at once:

```ts
const users = await r.users.createMany({
  data: [
    { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
  ],
});
// [{ id: 1, ... }, { id: 2, ... }]
```

## update

Update a record matching the `where` condition and return it:

```ts
const updated = await r.users.update({
  where: { id: 1 },
  data: { firstName: 'Jane' },
});
// { id: 1, firstName: 'Jane', ... }
```

The `where` clause supports all the same operators as `findMany`. The `data` object accepts partial updates -- only the specified columns are changed.

## updateMany

Update multiple records matching the filter. Returns a count:

```ts
const result = await r.users.updateMany({
  where: { role: 'guest' },
  data: { active: false },
});
// { count: 15 }
```

## delete

Delete a single record matching the `where` condition and return it:

```ts
const deleted = await r.users.delete({
  where: { id: 1 },
});
// { id: 1, firstName: 'John', ... }
```

## deleteMany

Delete multiple records matching the filter. Returns a count:

```ts
const result = await r.users.deleteMany({
  where: { active: false },
});
// { count: 8 }
```

## Managing relations

Use `connect`, `disconnect`, and `set` inside `update()` to manage relations without touching join tables directly.

### Reassign a belongs-to relation

```ts
// Change the author of a post (sets authorId = 2)
await r.posts.update({
  where: { id: 1 },
  data: { author: { connect: 2 } },
});

// Combine with scalar updates
await r.posts.update({
  where: { id: 1 },
  data: { title: 'New title', author: { connect: 3 } },
});

// Unset a nullable FK
await r.posts.update({
  where: { id: 1 },
  data: { reviewer: { disconnect: true } },
});
```

For one-to-one and many-to-one relations where the FK column is on the current table, `connect` sets the FK and `disconnect` sets it to null.

### Many-to-many via join table

```ts
// Add categories to a post
await r.posts.update({
  where: { id: 1 },
  data: { postCategories: { connect: [5, 6] } },
});

// Remove specific categories
await r.posts.update({
  where: { id: 1 },
  data: { postCategories: { disconnect: [5] } },
});

// Replace all -- deletes existing links and inserts new ones
await r.posts.update({
  where: { id: 1 },
  data: { postCategories: { set: [7, 8, 9] } },
});

// Add and remove in a single call
await r.posts.update({
  where: { id: 1 },
  data: {
    postCategories: { connect: [10], disconnect: [7] },
  },
});
```

### Join tables with extra columns

When the join table has columns beyond the two FKs, pass objects with `_id` for the target entity's primary key and any extra fields:

```ts
await r.posts.update({
  where: { id: 1 },
  data: {
    postCategories: {
      connect: [
        { _id: 5, isPrimary: true },
        { _id: 6, isPrimary: false },
      ],
    },
  },
});
```

`_id` maps to the target entity's FK on the join table. Other fields are passed through to the insert.

### Transaction safety

Many-to-many operations (connect, disconnect, set) are automatically wrapped in a transaction on PostgreSQL and MySQL. If any part fails, the entire operation rolls back -- including scalar updates in the same call.

SQLite uses a single connection and is inherently serial, so no explicit transaction wrapping is needed.

Parent transactions are respected: if you call `update()` inside `$transaction()`, the relation operations participate in the outer transaction.

```ts
await r.$transaction(async (tx) => {
  await tx.posts.update({
    where: { id: 1 },
    data: {
      title: 'Updated in tx',
      postCategories: { set: [1, 2] },
    },
  });
  // Both the title update and relation changes roll back if anything throws
  throw new Error('rollback');
});
```

## RETURNING behavior

The `create`, `update`, and `delete` methods return the affected row(s). This depends on dialect support:

| Dialect    | RETURNING support                                   |
| ---------- | --------------------------------------------------- |
| PostgreSQL | Native `RETURNING *`                                |
| SQLite     | Native `RETURNING *`                                |
| MySQL      | No RETURNING -- uses `insertId` fallback for create |

## Combining with transactions

All mutation methods are available inside transactions:

```ts
await r.$transaction(async (tx) => {
  const user = await tx.users.create({
    data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  });
  await tx.orders.create({
    data: { userId: user.id, total: 100 },
  });
});
```

See [Transactions](/transactions/) for details.
