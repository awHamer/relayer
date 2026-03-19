---
title: SSR Direct Call
description: Use route handlers directly from Server Components without HTTP round-trip.
---

## Overview

Each handler returned by `.list()` is both a Next.js route handler AND directly callable via `.query()`. Same config, same hooks, no HTTP round-trip.

## Basic usage

```ts
// lib/routes.ts
import { r } from '@/lib/relayer';
import { createRelayerRoute } from '@relayerjs/next';

export const userRoutes = createRelayerRoute(r, 'users', {
  /* config */
});

export const listHandler = userRoutes.list({
  defaultWhere: { active: true },
  defaultOrderBy: { field: 'createdAt', order: 'desc' },
  defaultLimit: 20,
});
```

```tsx
// app/users/page.tsx (Server Component)
import { listHandler } from '@/lib/routes';

export default async function UsersPage() {
  // Direct call — same validation, same hooks, same defaults
  const { data: users, meta } = await listHandler.query();

  return (
    <div>
      <p>Total: {meta.total}</p>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

## With custom filters

```tsx
const { data: admins } = await listHandler.query({
  where: { metadata: { role: 'admin' } },
  orderBy: { field: 'name', order: 'asc' },
  limit: 5,
});
```

## With auth context

Use `req` to pass request headers to `beforeRequest` hook:

```tsx
import { headers } from 'next/headers';

const { data: users } = await listHandler.query({
  req: new Request('http://localhost', { headers: await headers() }),
});
```

Or pass context directly:

```tsx
import { getUser } from '@/lib/auth';

const user = await getUser();
const { data: users } = await listHandler.query({
  context: { currentUserId: user.id },
});
```

## When to use

- **Server Components** — initial page data, no HTTP overhead
- **Server Actions** — direct database access with same validation
- **Cron jobs** — reuse the same query logic
- **Middleware** — pre-fetch data for layout

The same config (select/where restrictions, hooks, defaults) applies regardless of whether the call comes from HTTP or `.query()`.
