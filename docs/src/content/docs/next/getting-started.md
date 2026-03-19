---
title: 'Next.js: Getting Started'
description: Install @relayerjs/next, set up CRUD route handlers step by step.
---

## Installation

```bash
npm install @relayerjs/next @relayerjs/drizzle drizzle-orm next
```

## Step 1: Schema and entity models

Define your Drizzle schema as usual. Extend with computed/derived fields if needed:

```ts
// db/schema.ts
import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => users.id),
});

export const usersRelations = relations(users, ({ many }) => ({ posts: many(posts) }));
export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
```

```ts
// db/entities.ts
import { createRelayerEntity } from '@relayerjs/drizzle';

import * as schema from './schema';

const UserEntity = createRelayerEntity(schema, 'users');
const { computed, derived } = UserEntity;

export class User extends UserEntity {
  @computed({ resolve: ({ table, sql }) => sql`upper(${table.name})` })
  displayName!: string;

  @derived({
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({ [field()]: sql`count(*)::int`, authorId: s.posts.authorId })
        .from(s.posts)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived: d, eq }) => eq(parent.id, d.authorId),
  })
  postsCount!: number;
}

// No computed/derived needed? Just extend without decorators:
export class Post extends createRelayerEntity(schema, 'posts') {}

// Or simply omit this step, Relayer will use Drizzle schemas directly
```

See [Computed Fields](/computed-fields/) and [Derived Fields](/derived-fields/) for more.

## Step 2: Initialize Relayer

```ts
// lib/relayer.ts
import { db } from '@/db';
import { Post, User } from '@/db/entities';
import * as schema from '@/db/schema';
import { createRelayerDrizzle } from '@relayerjs/drizzle';

export const r = createRelayerDrizzle({
  db,
  schema,
  entities: { users: User, posts: Post },
});
```

## Step 3: Create routes

```ts
// lib/routes.ts
import { createRelayerRoute } from '@relayerjs/next';

import { r } from './relayer';

export const userRoutes = createRelayerRoute(r, 'users', {
  allowSelect: { posts: { title: true } },
  allowWhere: { email: { operators: ['eq', 'contains'] } },
  allowOrderBy: ['name', 'createdAt', 'postsCount'],
  maxLimit: 100,
  defaultLimit: 20,
});
```

## Step 4: Wire up API routes

```ts
// app/api/users/route.ts
import { userRoutes } from '@/lib/routes';

export const GET = userRoutes.list({
  defaultSelect: { id: true, name: true, email: true, postsCount: true },
  defaultOrderBy: { field: 'createdAt', order: 'desc' },
});

export const POST = userRoutes.create({
  beforeCreate: async (data, ctx) => {
    return { ...data, createdAt: new Date().toISOString() };
  },
});
```

```ts
// app/api/users/[id]/route.ts
import { userRoutes } from '@/lib/routes';

export const { GET, PATCH, DELETE } = userRoutes.detailHandlers();
```

```ts
// app/api/users/count/route.ts
export const { GET } = userRoutes.countHandlers();

// app/api/users/aggregate/route.ts
export const { GET } = userRoutes.aggregateHandlers();
```

## Step 5: Query with filters, sort, and pagination

```
GET /api/users?where={"email":{"contains":"@gmail.com"}}&orderBy={"field":"postsCount","order":"desc"}&limit=10
GET /api/users/1
POST /api/users  { "name": "John", "email": "john@test.com" }
PATCH /api/users/1  { "name": "Updated" }
DELETE /api/users/1
```

Response:

```json
{
  "data": [{ "id": 1, "name": "John", "postsCount": 5 }],
  "meta": { "total": 42, "limit": 10, "offset": 0 }
}
```

## File structure

```
app/api/users/
  route.ts              GET (list), POST (create)
  [id]/route.ts         GET (findById), PATCH (update), DELETE (delete)
  count/route.ts        GET (count)
  aggregate/route.ts    GET (aggregate)
```

## Next steps

- [Route Handlers](/next/route-handlers/) - all handlers in detail
- [Configuration](/next/configuration/) - allowSelect, allowWhere, allowOrderBy
- [Hooks](/next/hooks/) - business logic, auth, side effects
- [SSR Direct Call](/next/ssr/) - use handlers in Server Components
