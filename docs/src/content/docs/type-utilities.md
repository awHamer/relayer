---
title: Type Utilities
description: Extract Where, Select, OrderBy, and DotPaths types for custom methods and API handlers.
---

Relayer exports utility types for building type-safe custom methods and API handlers. Three ways to use them, from simplest to most powerful.

## From entity class (simplest)

Works directly with your entity class. No client instance needed.

```ts
import type { DotPaths, OrderByType, SelectType, WhereType } from '@relayerjs/drizzle';

type UserSelect = SelectType<User>;
type UserWhere = WhereType<User>;
type UserPaths = DotPaths<User>; // "id" | "firstName" | "fullName" | "postsCount" | ...
type UserOrderBy = OrderByType<User>;
```

Includes all scalar columns, computed fields, derived fields, AND/OR/NOT. Does not include relation resolution (use `InferModel` for that).

```ts
function findActiveUsers(where: WhereType<User>) {
  return r.users.findMany({ where: { ...where, active: true } });
}
```

## From client with InferModel (full power)

For relation dot paths and cross-entity computed/derived fields, extract a resolved model from the client:

```ts
import type { DotPaths, InferModel, OrderByType, SelectType, WhereType } from '@relayerjs/drizzle';

type Post = InferModel<typeof r, 'posts'>;

type PostWhere = WhereType<Post>; // includes author.fullName, author.postsCount
type PostPaths = DotPaths<Post>; // "id" | "title" | "author.fullName" | "author.orderSummary.totalAmount" | ...
type PostSelect = SelectType<Post>; // { author?: boolean | { fullName?: boolean; postsCount?: boolean; ... }; ... }
type PostOrderBy = OrderByType<Post>;
```

```ts
function findPublished(where: WhereType<Post>): Promise<Post[]> {
  return r.posts.findMany({ where: { ...where, published: true } });
}
```

### DotPaths

All valid dot-notation paths for orderBy and aggregate groupBy:

```ts
type UserPaths = DotPaths<InferModel<typeof r, 'users'>>;
// "id" | "firstName" | "fullName" | "postsCount"
// | "orderSummary.totalAmount" | "orderSummary.orderCount"
// | "posts.title" | "posts.author.fullName" | ...
```

## From client (alternative)

Extract types directly from client method signatures:

```ts
import type { InferEntityOrderBy, InferEntitySelect, InferEntityWhere } from '@relayerjs/drizzle';

type UserWhere = InferEntityWhere<typeof r, 'users'>;
type UserSelect = InferEntitySelect<typeof r, 'users'>;
type UserOrderBy = InferEntityOrderBy<typeof r, 'users'>;
```

Equivalent to `InferModel` + `WhereType`/`SelectType`/`OrderByType` but with two generic parameters.

## API handler example

```ts
type User = InferModel<typeof r, 'users'>;

app.get('/users', async (req, res) => {
  const where: WhereType<User> = req.query.filter;
  const orderBy: OrderByType<User> = req.query.sort;
  const users = await r.users.findMany({ where, orderBy });
  res.json(users);
});
```
