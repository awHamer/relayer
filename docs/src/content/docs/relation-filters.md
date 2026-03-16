---
title: Relation Filters
description: Filter parent records based on related data with $exists, $some, $every, and $none.
---

Relation filters let you filter parent records based on conditions on their related data. They translate to SQL `EXISTS` subqueries.

## $exists

Check whether a related record exists (for one-to-one relations):

```ts
const usersWithProfile = await r.users.findMany({
  where: {
    profile: { $exists: true },
  },
});

const usersWithoutProfile = await r.users.findMany({
  where: {
    profile: { $exists: false },
  },
});
```

## $some

Match parents that have **at least one** related record matching the condition (for one-to-many relations):

```ts
const authorsWithPublished = await r.users.findMany({
  where: {
    posts: { $some: { published: true } },
  },
});
```

Generates:

```sql
WHERE EXISTS (
  SELECT 1 FROM posts
  WHERE posts.author_id = users.id AND posts.published = true
)
```

## $every

Match parents where **all** related records match the condition:

```ts
const fullyPublishedAuthors = await r.users.findMany({
  where: {
    posts: { $every: { published: true } },
  },
});
```

Generates:

```sql
WHERE NOT EXISTS (
  SELECT 1 FROM posts
  WHERE posts.author_id = users.id AND NOT (posts.published = true)
)
```

## $none

Match parents that have **no** related records matching the condition:

```ts
const noSpamAuthors = await r.users.findMany({
  where: {
    posts: { $none: { spam: true } },
  },
});
```

Generates:

```sql
WHERE NOT EXISTS (
  SELECT 1 FROM posts
  WHERE posts.author_id = users.id AND posts.spam = true
)
```

## Combining relation filters

Relation filters can be combined with other where conditions:

```ts
const activeAuthors = await r.users.findMany({
  where: {
    active: true,
    posts: { $some: { published: true } },
    email: { contains: '@example.com' },
  },
});
```

## Nested conditions in relation filters

The condition inside `$some`, `$every`, and `$none` supports all standard operators:

```ts
await r.users.findMany({
  where: {
    posts: {
      $some: {
        title: { contains: 'TypeScript' },
        published: true,
        createdAt: { gte: new Date('2024-01-01') },
      },
    },
  },
});
```

## Summary

| Operator | Meaning | SQL |
|---|---|---|
| `$exists: true` | Related record exists | `EXISTS (SELECT 1 ...)` |
| `$exists: false` | No related record | `NOT EXISTS (SELECT 1 ...)` |
| `$some: { ... }` | At least one match | `EXISTS (SELECT 1 ... WHERE condition)` |
| `$every: { ... }` | All match | `NOT EXISTS (SELECT 1 ... WHERE NOT condition)` |
| `$none: { ... }` | None match | `NOT EXISTS (SELECT 1 ... WHERE condition)` |
