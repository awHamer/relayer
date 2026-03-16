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
  entities: { /* ... */ },
});
```

The `context: {} as AppContext` parameter defines the shape. The empty object is just a type hint -- context values are provided per-query.

## Using context in computed fields

The `resolve` function receives `context` as part of its argument:

```ts
entities: {
  users: {
    fields: {
      isMe: {
        type: FieldType.Computed,
        valueType: 'boolean',
        resolve: ({ table, sql, context }) =>
          sql`CASE WHEN ${table.id} = ${context.currentUserId} THEN true ELSE false END`,
      },
    },
  },
},
```

## Using context in derived fields

The `query` function also receives `context`:

```ts
entities: {
  users: {
    fields: {
      recentOrderCount: {
        type: FieldType.Derived,
        valueType: 'number',
        query: ({ db, schema: s, sql, context }) =>
          db
            .select({
              recentOrderCount: sql`count(*)::int`,
              userId: s.orders.userId,
            })
            .from(s.orders)
            .where(sql`${s.orders.createdAt} > ${context.since}`)
            .groupBy(s.orders.userId),
        on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
      },
    },
  },
},
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
isOwner: {
  type: FieldType.Computed,
  valueType: 'boolean',
  resolve: ({ table, sql, context }) =>
    sql`CASE WHEN ${table.createdBy} = ${context.userId} THEN true ELSE false END`,
},
```

### Multi-tenancy

```ts
// Use context to scope derived field queries to the current tenant
tenantOrderCount: {
  type: FieldType.Derived,
  valueType: 'number',
  query: ({ db, schema: s, sql, context }) =>
    db
      .select({ tenantOrderCount: sql`count(*)::int`, userId: s.orders.userId })
      .from(s.orders)
      .where(sql`${s.orders.tenantId} = ${context.tenantId}`)
      .groupBy(s.orders.userId),
  on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
},
```

### Time-based filtering

```ts
recentActivity: {
  type: FieldType.Derived,
  valueType: 'number',
  query: ({ db, schema: s, sql, context }) =>
    db
      .select({ recentActivity: sql`count(*)::int`, userId: s.events.userId })
      .from(s.events)
      .where(sql`${s.events.createdAt} >= ${context.since}`)
      .groupBy(s.events.userId),
  on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
},
```
