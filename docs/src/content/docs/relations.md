---
title: Relations
description: Loading related data via select with no N+1 queries.
---

Relayer loads relations via efficient batch queries using `WHERE IN` -- no N+1 problem.

## Setup

Relations must be defined in your Drizzle schema using the `relations()` function:

```ts
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many, one }) => ({
  posts: many(posts),
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}));
```

Relayer reads these relation definitions from your schema automatically.

## Loading relations

Include relations in the `select` to load them:

### One-to-many

```ts
const usersWithPosts = await r.users.findMany({
  select: {
    id: true,
    firstName: true,
    posts: { id: true, title: true },
  },
});
// [
//   { id: 1, firstName: 'John', posts: [{ id: 1, title: 'Hello World' }, { id: 2, title: 'TS Tips' }] },
//   { id: 2, firstName: 'Jane', posts: [{ id: 3, title: 'Relayer Guide' }] },
// ]
```

One-to-many relations are returned as arrays.

### Many-to-one

```ts
const postsWithAuthor = await r.posts.findMany({
  select: {
    id: true,
    title: true,
    author: { firstName: true, email: true },
  },
});
// [
//   { id: 1, title: 'Hello World', author: { firstName: 'John', email: 'john@example.com' } },
// ]
```

Many-to-one relations are returned as objects.

### One-to-one

```ts
const usersWithProfile = await r.users.findMany({
  select: {
    id: true,
    firstName: true,
    profile: { bio: true },
  },
});
// [{ id: 1, firstName: 'John', profile: { bio: 'Developer' } }, ...]
```

## Deep nesting

Relations can be nested to any depth:

```ts
const data = await r.users.findMany({
  select: {
    id: true,
    posts: {
      title: true,
      comments: {
        content: true,
        author: { firstName: true },
      },
    },
  },
});
// [
//   {
//     id: 1,
//     posts: [
//       {
//         title: 'Hello World',
//         comments: [
//           { content: 'Great post!', author: { firstName: 'Jane' } },
//         ],
//       },
//     ],
//   },
// ]
```

Each level of nesting produces one additional batch query.

## How it works

Relayer uses batch loading to avoid N+1 queries:

1. Execute the main query to get parent records
2. Collect the foreign key values from all parents
3. Run a single `WHERE IN (...)` query for each requested relation
4. Match the results back to their parents by FK

For example, loading users with posts:

```sql
-- Main query
SELECT id, first_name FROM users

-- Batch relation query
SELECT id, title, author_id FROM posts WHERE author_id IN (1, 2, 3)
```

Two queries total, regardless of how many users are returned.

## Nested relation selects

You can choose which columns to load from the related table:

```ts
const usersWithPosts = await r.users.findMany({
  select: {
    id: true,
    posts: { title: true },  // only load title from posts
  },
});
```

Foreign key columns needed for joining are loaded automatically (and stripped from the result).

## Combining with other features

Relations work alongside all other query features:

```ts
const users = await r.users.findMany({
  select: {
    id: true,
    fullName: true,        // computed field
    postsCount: true,       // derived field
    posts: { title: true }, // relation
  },
  where: { email: { contains: '@example.com' } },
  orderBy: { field: 'fullName', order: 'asc' },
  limit: 10,
});
```
