---
title: Transactions
description: Wrap multiple operations in a transaction with automatic commit and rollback.
---

## $transaction

Use `$transaction` to wrap multiple operations in a database transaction:

```ts
await r.$transaction(async (tx) => {
  const user = await tx.users.create({
    data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  });

  await tx.orders.create({
    data: { userId: user.id, total: 100 },
  });

  // Automatically committed when the callback returns
});
```

## Automatic commit and rollback

- The transaction is **committed** when the callback resolves successfully
- The transaction is **rolled back** when the callback throws an error

```ts
try {
  await r.$transaction(async (tx) => {
    await tx.users.create({
      data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    });

    // This will cause a rollback -- the user above will not be created
    throw new Error('Something went wrong');
  });
} catch (error) {
  // Transaction was rolled back
}
```

## Transaction client

The `tx` parameter inside the callback is a full Relayer client scoped to the transaction. It has the same API as the root client:

- `tx.users.findMany(...)` -- queries within the transaction
- `tx.users.create(...)` -- mutations within the transaction
- `tx.users.update(...)` -- mutations within the transaction
- `tx.users.delete(...)` -- mutations within the transaction
- `tx.users.count(...)` -- count within the transaction
- `tx.users.aggregate(...)` -- aggregate within the transaction

All operations on `tx` use the same database connection and see each other's changes.

## Use cases

### Atomic creation of related records

```ts
await r.$transaction(async (tx) => {
  const user = await tx.users.create({
    data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  });

  await tx.profiles.create({
    data: { userId: user.id, bio: 'New user' },
  });

  await tx.orders.create({
    data: { userId: user.id, total: 0, status: 'pending' },
  });
});
```

### Conditional logic with reads

```ts
await r.$transaction(async (tx) => {
  const user = await tx.users.findFirst({
    where: { email: 'john@example.com' },
  });

  if (!user) {
    throw new Error('User not found');
  }

  await tx.orders.create({
    data: { userId: user.id, total: 250 },
  });
});
```
