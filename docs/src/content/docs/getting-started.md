---
title: Getting Started
description: Install Relayer, define your schema, and run your first query.
---

## Installation

```bash
npm install @relayerjs/drizzle drizzle-orm
```

You only need `@relayerjs/drizzle` -- it re-exports everything from `@relayerjs/core`.

> Relayer currently supports Drizzle ORM `>=0.38.0`. Drizzle v1 is currently in beta -- Relayer will add support for it once v1 reaches a stable release.

## Define your Drizzle schema

Relayer works on top of a standard Drizzle schema with relations defined.

```ts
import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  metadata: jsonb('metadata').$type<{
    role: string;
    level: number;
    settings: { theme: string; notifications: boolean };
  }>(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  published: boolean('published').default(false).notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

const schema = { users, posts, usersRelations, postsRelations };
```

## Create the Relayer client

```ts
import { createRelayerDrizzle, FieldType } from '@relayerjs/drizzle';

import { db } from './db';
import * as schema from './schema';

const r = createRelayerDrizzle({
  db, // your drizzle instance
  schema, // the full schema including relations
  entities: {
    users: {
      fields: {
        fullName: {
          type: FieldType.Computed,
          valueType: 'string',
          resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
        },
        postsCount: {
          type: FieldType.Derived,
          valueType: 'number',
          query: ({ db, schema: s, sql, field }) =>
            db
              .select({ [field()]: sql`count(*)::int`, userId: s.posts.authorId })
              .from(s.posts)
              .groupBy(s.posts.authorId),
          on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
        },
      },
    },
  },
});
```

The `createRelayerDrizzle` call:

1. **Introspects** your Drizzle schema -- tables, columns, relations
2. **Registers** computed and derived fields from the `entities` config
3. **Detects** the SQL dialect (PostgreSQL, MySQL, or SQLite) from your table definitions
4. **Returns** a Proxy-based client where each table name maps to a typed entity client

## Your first query

```ts
const users = await r.users.findMany({
  select: { id: true, firstName: true, fullName: true, postsCount: true },
  where: { email: { contains: '@example.com' } },
  orderBy: { field: 'firstName', order: 'asc' },
  limit: 10,
});
// [{ id: 1, firstName: 'John', fullName: 'John Doe', postsCount: 3 }, ...]
```

Every part of the query is fully typed -- `select` keys, `where` operators, `orderBy` field names, and the result type are all inferred from your schema and field definitions.

## Next steps

- [Computed Fields](/computed-fields/) -- virtual SQL expressions
- [Derived Fields](/derived-fields/) -- automatic subquery JOINs
- [Basic Queries](/querying/) -- findMany, findFirst, select, where, orderBy
- [Operators](/operators/) -- all 20+ filter operators
- [Relations](/relations/) -- loading related data
