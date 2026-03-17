---
title: Type Utilities
description: Extract Where, Select, and OrderBy types from your Relayer client for custom methods and API handlers.
---

Relayer exports utility types that let you extract `Where`, `Select`, and `OrderBy` types for any entity directly from your client instance. This is useful for building custom methods, API handlers, or reusable query helpers.

## InferEntityWhere

Extract the full where type for an entity, including scalar columns, computed/derived fields, relation filters, AND/OR/NOT, and $raw.

```ts
import type { InferEntityWhere } from '@relayerjs/drizzle';

type UserWhere = InferEntityWhere<typeof r, 'users'>;

function findActiveUsers(where: UserWhere) {
  return r.users.findMany({
    where: { ...where, active: true },
  });
}
```

## InferEntitySelect

Extract the select type with all scalar columns, computed fields, derived fields, and relation nested selects.

```ts
import type { InferEntitySelect } from '@relayerjs/drizzle';

type UserSelect = InferEntitySelect<typeof r, 'users'>;

function getUsers(select: UserSelect) {
  return r.users.findMany({ select });
}
```

## InferEntityOrderBy

Extract the order-by type including dot-notation paths for object-type derived fields.

```ts
import type { InferEntityOrderBy } from '@relayerjs/drizzle';

type UserOrderBy = InferEntityOrderBy<typeof r, 'users'>;

function getSortedUsers(orderBy: UserOrderBy) {
  return r.users.findMany({ orderBy });
}
```

## API handler example

These types make it trivial to build type-safe API endpoints:

```ts
import type { InferEntityOrderBy, InferEntityWhere } from '@relayerjs/drizzle';

type UserWhere = InferEntityWhere<typeof r, 'users'>;
type UserOrderBy = InferEntityOrderBy<typeof r, 'users'>;

app.get('/users', async (req, res) => {
  const where: UserWhere = req.query.filter;
  const orderBy: UserOrderBy = req.query.sort;
  const users = await r.users.findMany({ where, orderBy });
  res.json(users);
});
```

## WhereType (standalone)

If you need a where type from a plain TypeScript interface (without a Relayer client), use `WhereType` from `@relayerjs/core`:

```ts
import type { WhereType } from '@relayerjs/core';

interface User {
  id: number;
  name: string;
  age?: number;
  metadata?: { role: string; level: number };
}

function filterUsers(where: WhereType<User>) { ... }

filterUsers({
  name: { contains: 'John' },
  age: { gte: 18 },
  metadata: { role: 'admin' },
  AND: [{ name: 'X' }],
});
```

`WhereType<T>` maps each field to the correct operators based on its TypeScript type (string fields get `contains`/`startsWith`/`ilike`, number fields get `gt`/`gte`/`lt`/`lte`, etc.).
