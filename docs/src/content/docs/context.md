---
title: Context
description: Pass per-request typed context to computed and derived field resolvers.
---

Context lets you pass per-request data (current user, tenant, locale, time window, etc.) into computed and derived field resolvers. The shape is fully typed via the third generic parameter of `createRelayerEntity`, so you get autocomplete and type safety inside `resolve` and `query` callbacks — no casts.

## Defining the context type

Pass your context interface as the third generic to `createRelayerEntity`. Every computed/derived resolver on the entity then receives a typed `context`:

```ts
import { createRelayerEntity } from '@relayerjs/drizzle';

import * as schema from './schema';

interface AppContext {
  currentUserId: number;
  tenantId: string;
}

const UserEntity = createRelayerEntity<typeof schema, 'users', AppContext>(schema, 'users');
```

## Using context in computed fields

`context` inside `resolve` is typed as `AppContext` directly — no `as` cast needed:

```ts
class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql, context }) =>
      sql`CASE WHEN ${table.id} = ${context.currentUserId} THEN true ELSE false END`,
  })
  isMe!: boolean;
}
```

## Using context in derived fields

The `query` callback receives the same typed context:

```ts
class User extends UserEntity {
  @UserEntity.derived({
    query: ({ db, schema: s, sql, context, field }) =>
      db
        .select({ [field()]: sql`count(*)::int`, userId: s.orders.userId })
        .from(s.orders)
        .where(sql`${s.orders.tenantId} = ${context.tenantId}`)
        .groupBy(s.orders.userId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
  })
  tenantOrderCount!: number;
}
```

## Passing context per-query

Provide context values in each query call. The shape is checked against the entity's `TContext`:

```ts
const users = await r.users.findMany({
  select: { id: true, firstName: true, isMe: true },
  context: { currentUserId: 42, tenantId: 'acme' },
});
// [
//   { id: 42, firstName: 'John', isMe: true },
//   { id: 43, firstName: 'Jane', isMe: false },
// ]
```

If you forget a field or pass the wrong shape, TypeScript will reject the call at compile time.

## Typical use cases

### Current user

```ts
interface AppContext {
  userId: number;
}

const PostEntity = createRelayerEntity<typeof schema, 'posts', AppContext>(schema, 'posts');

class Post extends PostEntity {
  @PostEntity.computed({
    resolve: ({ table, sql, context }) =>
      sql`CASE WHEN ${table.createdBy} = ${context.userId} THEN true ELSE false END`,
  })
  isOwner!: boolean;
}
```

### Multi-tenancy

```ts
interface AppContext {
  tenantId: string;
}

const UserEntity = createRelayerEntity<typeof schema, 'users', AppContext>(schema, 'users');

class User extends UserEntity {
  @UserEntity.derived({
    query: ({ db, schema: s, sql, context, field }) =>
      db
        .select({ [field()]: sql`count(*)::int`, userId: s.orders.userId })
        .from(s.orders)
        .where(sql`${s.orders.tenantId} = ${context.tenantId}`)
        .groupBy(s.orders.userId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
  })
  tenantOrderCount!: number;
}
```

### Time-based filtering

```ts
interface AppContext {
  since: Date;
}

const UserEntity = createRelayerEntity<typeof schema, 'users', AppContext>(schema, 'users');

class User extends UserEntity {
  @UserEntity.derived({
    query: ({ db, schema: s, sql, context, field }) =>
      db
        .select({ [field()]: sql`count(*)::int`, userId: s.events.userId })
        .from(s.events)
        .where(sql`${s.events.createdAt} >= ${context.since}`)
        .groupBy(s.events.userId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
  })
  recentActivity!: number;
}
```

## Where context flows

Context propagates through every read method on the entity client: `findMany`, `findFirst`, `count`, `findManyStream`, and `aggregate`. Mutation methods (`create`, `update`, `delete`, etc.) also accept a `context` option, so when used through `@relayerjs/nestjs-crud` it can drive row-level filtering via `getDefaultWhere` — see [NestJS Query Service](/nestjs/query-service/#typed-context).
