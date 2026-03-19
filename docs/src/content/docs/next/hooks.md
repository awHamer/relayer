---
title: Hooks
description: Global and per-handler hooks for auth, validation, side effects, and business logic.
---

## Two levels of hooks

1. **Global hooks** — in `createRelayerRoute()` config. Run on every request.
2. **Per-handler hooks** — in `.list()`, `.create()`, etc. Run only for that handler.

## Global hooks

```ts
const userRoutes = createRelayerRoute(r, 'users', {
  hooks: {
    beforeRequest: async (ctx, req) => {
      const token = req.headers.get('authorization');
      ctx.user = await verifyToken(token);
      ctx.context = { currentUserId: ctx.user.id };
    },
  },
});
```

`beforeRequest` runs before any handler. Use it for auth, context injection, logging.

## Per-handler hooks

### list

```ts
export const GET = userRoutes.list({
  defaultSelect: { id: true, name: true, email: true, role: true },
  defaultWhere: { active: true },
  defaultOrderBy: { field: 'createdAt', order: 'desc' },
  defaultLimit: 20,

  beforeFind: async (options, ctx) => {
    options.where = { ...options.where, tenantId: ctx.user.tenantId };
  },

  afterFind: async (results, ctx) => {
    return results.map((r) => ({ ...r, avatarUrl: buildAvatar(r.email) }));
  },
});
```

### create

```ts
export const POST = userRoutes.create({
  beforeCreate: async (data, ctx) => {
    data.createdBy = ctx.user.id;
    data.slug = slugify(data.name);
    return data; // return modified data, or false to cancel
  },

  afterCreate: async (created, ctx) => {
    await sendWelcomeEmail(created.email);
    await ctx.tx.auditLogs.create({ data: { action: 'user.created', targetId: created.id } });
    return created;
  },
});
```

### update

```ts
export const PATCH = userRoutes.update({
  beforeUpdate: async (data, where, ctx) => {
    data.updatedBy = ctx.user.id;
    return data; // return modified data, or false to cancel
  },

  afterUpdate: async (updated, ctx) => {
    await invalidateCache(`user:${updated.id}`);
    return updated;
  },
});
```

### remove

```ts
export const DELETE = userRoutes.remove({
  beforeDelete: async (where, ctx) => {
    // Soft delete instead of hard delete
    await ctx.tx.users.update({ where, data: { deletedAt: new Date() } });
    return false; // false cancels the default delete
  },
});
```

## Transactions

All mutation hooks (create, update, remove) run inside an automatic transaction. `ctx.tx` is the transactional Relayer client:

```
BEGIN
  beforeCreate(data, ctx)     -- ctx.tx available
  entity.create(data)         -- main operation
  afterCreate(created, ctx)   -- ctx.tx available
COMMIT / ROLLBACK on throw
```

Throw in any hook to rollback the entire transaction.

## Hook pipeline

### Queries (no transaction)

```
beforeRequest(ctx, req)         -- global: auth, context
beforeFind(options, ctx)        -- per-handler: modify query
entity.findMany(options)        -- main query
afterFind(results, ctx)         -- per-handler: transform response
```

### Mutations (automatic transaction)

```
beforeRequest(ctx, req)         -- global: auth, context
BEGIN TRANSACTION
  beforeCreate(data, ctx)       -- per-handler: validate, enrich
  entity.create(data)           -- main operation via ctx.tx
  afterCreate(created, ctx)     -- per-handler: side effects
COMMIT / ROLLBACK
```
