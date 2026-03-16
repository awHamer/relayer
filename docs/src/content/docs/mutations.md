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

## RETURNING behavior

The `create`, `update`, and `delete` methods return the affected row(s). This depends on dialect support:

| Dialect | RETURNING support |
|---|---|
| PostgreSQL | Native `RETURNING *` |
| SQLite | Native `RETURNING *` |
| MySQL | No RETURNING -- uses `insertId` fallback for create |

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
