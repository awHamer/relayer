---
title: Auth Patterns
description: Role-based access, tenant isolation, CASL integration, and $raw for custom authorization.
---

## Basic auth via beforeRequest

```ts
const userRoutes = createRelayerRoute(r, 'users', {
  hooks: {
    beforeRequest: async (ctx, req) => {
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!token) throw new Error('Unauthorized');
      ctx.user = await verifyToken(token);
      ctx.context = { currentUserId: ctx.user.id };
    },
  },
});
```

## Role-based filtering

Different roles see different data:

```ts
export const GET = userRoutes.list({
  beforeFind: async (options, ctx) => {
    const user = ctx.user as { role: string; groupIds: number[] };

    if (user.role === 'viewer') {
      // Viewers only see public records
      options.where = { ...options.where, isPublic: true };
    }

    if (user.role === 'group_member') {
      // Members see records in their groups
      options.where = { ...options.where, groupId: { in: user.groupIds } };
    }

    // Admins see everything — no filter added
  },
});
```

## Tenant isolation

Automatically scope all queries to the current tenant:

```ts
const taskRoutes = createRelayerRoute(r, 'tasks', {
  hooks: {
    beforeRequest: async (ctx, req) => {
      ctx.tenantId = req.headers.get('x-tenant-id');
      if (!ctx.tenantId) throw new Error('Missing tenant');
    },
  },
});

export const GET = taskRoutes.list({
  beforeFind: async (options, ctx) => {
    options.where = { ...options.where, tenantId: ctx.tenantId };
  },
});

export const POST = taskRoutes.create({
  beforeCreate: async (data, ctx) => {
    data.tenantId = ctx.tenantId;
    return data;
  },
});
```

## Using $raw for complex authorization

```ts
export const GET = taskRoutes.list({
  beforeFind: async (options, ctx) => {
    const user = ctx.user as { id: number; teamIds: number[] };
    options.where = {
      ...options.where,
      $raw: ({ table, sql }) =>
        sql`${table.createdBy} = ${user.id} OR ${table.teamId} = ANY(${user.teamIds})`,
    };
  },
});
```

## CASL integration

If you use [CASL](https://casl.js.org) for authorization:

```ts
import { accessibleBy } from '@casl/prisma'; // or build your own adapter

export const GET = taskRoutes.list({
  beforeFind: async (options, ctx) => {
    const ability = defineAbilityFor(ctx.user);
    const caslWhere = accessibleBy(ability).Task;
    options.where = { ...options.where, ...caslWhere };
  },
});
```

## Mutation guards

Prevent unauthorized mutations:

```ts
export const DELETE = taskRoutes.remove({
  beforeDelete: async (where, ctx) => {
    const user = ctx.user as { role: string };
    if (user.role !== 'admin') {
      throw new Error('Only admins can delete records');
    }
    return where;
  },
});
```
