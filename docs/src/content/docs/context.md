---
title: Context
description: Pass per-request typed context to computed and derived field resolvers.
---

Context lets you pass per-request data (current user, tenant, locale, etc.) into computed and derived field resolvers. It is fully typed.

## Defining the context type

Pass the context type when creating the Relayer client:

```ts
interface AppContext {
  currentUserId: number;
  tenantId: string;
}

const r = createRelayerDrizzle({
  db,
  schema,
  context: {} as AppContext,
  entities: { users: User },
});
```

The `context: {} as AppContext` parameter defines the shape. The empty object is just a type hint, context values are provided per-query.

## Using context in computed fields

The `resolve` function receives `context` as part of its argument:

```ts
const UserEntity = createRelayerEntity(schema, 'users');

class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql, context }) =>
      sql`CASE WHEN ${table.id} = ${(context as AppContext).currentUserId} THEN true ELSE false END`,
  })
  isMe!: boolean;
}
```

## Using context in derived fields

The `query` function also receives `context`:

```ts
class User extends UserEntity {
  @UserEntity.derived({
    query: ({ db, schema: s, sql, context, field }) =>
      db
        .select({ [field()]: sql`count(*)::int`, userId: s.orders.userId })
        .from(s.orders)
        .where(sql`${s.orders.createdAt} > ${(context as AppContext & { since: Date }).since}`)
        .groupBy(s.orders.userId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
  })
  recentOrderCount!: number;
}
```

## Passing context per-query

Provide context values in each query call:

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

## Typical use cases

### Current user

```ts
class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql, context }) =>
      sql`CASE WHEN ${table.createdBy} = ${(context as any).userId} THEN true ELSE false END`,
  })
  isOwner!: boolean;
}
```

### Multi-tenancy

```ts
class User extends UserEntity {
  @UserEntity.derived({
    query: ({ db, schema: s, sql, context, field }) =>
      db
        .select({ [field()]: sql`count(*)::int`, userId: s.orders.userId })
        .from(s.orders)
        .where(sql`${s.orders.tenantId} = ${(context as any).tenantId}`)
        .groupBy(s.orders.userId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
  })
  tenantOrderCount!: number;
}
```

### Time-based filtering

```ts
class User extends UserEntity {
  @UserEntity.derived({
    query: ({ db, schema: s, sql, context, field }) =>
      db
        .select({ [field()]: sql`count(*)::int`, userId: s.events.userId })
        .from(s.events)
        .where(sql`${s.events.createdAt} >= ${(context as any).since}`)
        .groupBy(s.events.userId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
  })
  recentActivity!: number;
}
```
