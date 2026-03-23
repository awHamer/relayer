# @relayerjs/next

Next.js App Router CRUD integration for [Relayer](https://github.com/awHamer/relayer). Type-safe route handlers with hooks, validation, and SSR support.

## Installation

```bash
npm install @relayerjs/next @relayerjs/drizzle drizzle-orm next
```

## Setup

### 1. Define your schema and entity models

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

Extend models with computed/derived fields if needed:

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

### 2. Initialize Relayer

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
  defaultRelationLimit: 20, // cap many-type relations at 20 rows
});
```

### 3. Create routes

```ts
// lib/routes.ts
import { createRelayerRoute } from '@relayerjs/next';

import { r } from './relayer';

export const userRoutes = createRelayerRoute(r, 'users', {
  allowSelect: { posts: { $limit: 10, title: true } }, // $limit caps relation rows
  allowWhere: { email: { operators: ['eq', 'contains'] } },
  allowOrderBy: ['name', 'createdAt', 'postsCount'],
  maxLimit: 100,
  defaultLimit: 20,
});
```

### 4. Wire up API routes

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

### 5. Query with filters, sort, and pagination

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

## Hooks

Hooks can intercept any step. Return `data` to continue, `false` to cancel, or a `Response` for full control:

```ts
export const POST = userRoutes.create({
  beforeCreate: async (data, ctx) => {
    if (!ctx.user) return new Response(null, { status: 401 });
    return { ...data, createdBy: ctx.user.id };
  },
  afterCreate: async (created, ctx) => {
    await sendWelcomeEmail(created.email);
    return created;
  },
});
```

## SSR Direct Call

Use `.query()` in Server Components, same config and hooks, no HTTP:

```tsx
const { data: users, meta } = await listHandler.query({
  where: { role: 'admin' },
  limit: 10,
});
```

## Documentation

Full docs at [relayerjs.vercel.app/next/getting-started](https://relayerjs.vercel.app/next/getting-started/)

## License

[MIT](../../LICENSE)
