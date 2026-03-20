---
title: Computed Fields
description: Virtual SQL expressions evaluated at SELECT time, with full filtering and sorting support.
---

Computed fields are virtual SQL expressions evaluated at SELECT time. They are not stored in the database. Relayer injects them into the SQL `SELECT` clause as expressions.

## Defining computed fields

Computed fields are defined as decorated properties on entity classes.

```ts
import { createRelayerEntity } from '@relayerjs/drizzle';

import * as schema from './schema';

const UserEntity = createRelayerEntity(schema, 'users');

class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  fullName!: string;
}
```

The `@UserEntity.computed()` decorator accepts a config with:

| Property  | Description                               |
| --------- | ----------------------------------------- |
| `resolve` | A function that returns an SQL expression |

The TypeScript type comes from the property declaration (`fullName!: string`), not from a `valueType` config.

## The resolve function

The `resolve` function receives a context object with:

- **`table`**: the current table's column references (e.g. `table.firstName`), fully typed
- **`schema`**: the full Drizzle schema
- **`sql`**: the Drizzle `sql` tagged template
- **`context`**: the per-query context (see [Context](/context/))

```ts
class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql }) => sql`${table.deletedAt} IS NULL AND ${table.verified} = true`,
  })
  isActive!: boolean;
}
```

## Using computed fields

### In select

```ts
const users = await r.users.findMany({
  select: { id: true, fullName: true },
});
// [{ id: 1, fullName: 'John Doe' }, ...]
```

### In where

```ts
const users = await r.users.findMany({
  where: { fullName: { contains: 'John' } },
});
```

The operators available for filtering are determined by the property's TypeScript type:

- `string` -> string operators (eq, contains, ilike, startsWith, etc.)
- `number` -> number operators (eq, gt, gte, lt, lte, etc.)
- `boolean` -> boolean operators (eq, ne)
- `Date` -> date operators (eq, gt, gte, lt, lte, etc.)

### In orderBy

```ts
const users = await r.users.findMany({
  select: { id: true, fullName: true },
  orderBy: { field: 'fullName', order: 'asc' },
});
```

## Computed fields with context

Computed fields can access per-request context, useful for user-specific expressions.

```ts
const UserEntity = createRelayerEntity(schema, 'users');

class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql, context }) =>
      sql`CASE WHEN ${table.id} = ${(context as any).currentUserId} THEN true ELSE false END`,
  })
  isMe!: boolean;
}

const users = await r.users.findMany({
  select: { id: true, firstName: true, isMe: true },
  context: { currentUserId: 42 },
});
// [{ id: 42, firstName: 'John', isMe: true }, { id: 43, firstName: 'Jane', isMe: false }]
```

See [Context](/context/) for more details.

## How it works

When a computed field is requested (in select, where, or orderBy), Relayer calls the `resolve` function and injects the resulting SQL expression directly into the query:

```sql
SELECT id, "first_name" || ' ' || "last_name" AS "fullName"
FROM users
ORDER BY "fullName" ASC
```

No post-processing, no extra queries, just SQL.
