---
title: Standalone Schemas
description: Get Zod validation schemas for custom endpoints.
---

## Overview

Sometimes you need the validation logic without the full route handler — for a custom endpoint, middleware, or server action. `@relayerjs/next` exports standalone schema generators.

## createWhereSchema

```ts
import { createWhereSchema } from '@relayerjs/next';

const taskWhereSchema = createWhereSchema(r.tasks, {
  status: { operators: ['eq', 'in'] },
  priority: true,
  password: false,
});

// Use in a custom route handler
export async function GET(req: Request) {
  const url = new URL(req.url);
  const whereStr = url.searchParams.get('where');
  const where = taskWhereSchema.parse(whereStr ? JSON.parse(whereStr) : undefined);

  const results = await r.tasks.findMany({ where });
  return Response.json({ data: results });
}
```

## createSelectSchema

```ts
import { createSelectSchema } from '@relayerjs/next';

const userSelectSchema = createSelectSchema(r.users, {
  password: false,
  posts: { title: true },
});
```

## createOrderBySchema

```ts
import { createOrderBySchema } from '@relayerjs/next';

const userOrderBySchema = createOrderBySchema(r.users, ['name', 'createdAt', 'author.firstName']);
```

## Combining schemas

```ts
import { z } from 'zod';

const listQuerySchema = z.object({
  where: taskWhereSchema,
  orderBy: createOrderBySchema(r.tasks, ['title', 'createdAt']),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = listQuerySchema.parse({
    where: url.searchParams.get('where') ? JSON.parse(url.searchParams.get('where')!) : undefined,
    orderBy: url.searchParams.get('orderBy')
      ? JSON.parse(url.searchParams.get('orderBy')!)
      : undefined,
    limit: url.searchParams.get('limit'),
    offset: url.searchParams.get('offset'),
  });

  const results = await r.tasks.findMany(params);
  return Response.json({ data: results });
}
```
