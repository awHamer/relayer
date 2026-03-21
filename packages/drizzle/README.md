# @relayerjs/drizzle

Drizzle ORM adapter for Relayer: type-safe repository layer with class-based entity models, computed fields, derived fields, and query DSL.

## Installation

```bash
npm install @relayerjs/drizzle drizzle-orm
```

## Setup

```ts
import { createRelayerDrizzle, createRelayerEntity } from '@relayerjs/drizzle';

import { db } from './db';
import * as schema from './schema';

// Define entity model
const UserEntity = createRelayerEntity(schema, 'users');

class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  fullName!: string;

  @UserEntity.computed({
    resolve: ({ table, sql, context }) =>
      sql`CASE WHEN ${table.id} = ${(context as any).currentUserId} THEN true ELSE false END`,
  })
  isMe!: boolean;

  @UserEntity.derived({
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({ [field()]: sql`count(*)::int`, userId: s.posts.authorId })
        .from(s.posts)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
  })
  postsCount!: number;

  @UserEntity.derived({
    shape: { totalAmount: 'string', orderCount: 'number' },
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({
          [field('totalAmount')]: sql`COALESCE(sum(${s.orders.total}), 0)::text`,
          [field('orderCount')]: sql`count(*)::int`,
          userId: s.orders.userId,
        })
        .from(s.orders)
        .groupBy(s.orders.userId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
  })
  orderSummary!: { totalAmount: string; orderCount: number };
}

// Create client
const r = createRelayerDrizzle({
  db,
  schema,
  entities: { users: User },
});
```

Entity models are classes that extend a base created by `createRelayerEntity(schema, 'tableName')`. Use `@Entity.computed()` and `@Entity.derived()` decorators to define virtual fields. The TypeScript type comes from the property declaration, not from a `valueType` config.

## Computed Fields

Virtual SQL expressions evaluated at SELECT time. Not stored in the database. The `resolve` function receives `{ table, schema, sql, context }` and returns an SQL expression.

```ts
const users = await r.users.findMany({
  select: { id: true, fullName: true, isMe: true },
  context: { currentUserId: 1 },
});
// [{ id: 1, fullName: 'John Doe', isMe: true }, ...]
```

## Derived Fields

Subqueries automatically joined to the main query. Useful for aggregations and cross-table computations. Each derived field has:

- `query`: a function that builds a Drizzle subquery (receives `{ db, schema, sql, context, field }`)
- `on`: a function that defines the JOIN condition (receives `{ parent, derived, eq }`)
- `shape`: required for object-type derived fields, defines sub-field keys/types

### Scalar derived

```ts
const users = await r.users.findMany({
  select: { id: true, firstName: true, postsCount: true },
});
// [{ id: 1, firstName: 'John', postsCount: 3 }, ...]
```

### Object-type derived

When the property type is an object, provide `shape` and use `field('subField')` in the query:

```ts
const users = await r.users.findMany({
  select: { id: true, orderSummary: { totalAmount: true } },
});
// [{ id: 1, orderSummary: { totalAmount: '5000' } }, ...]
```

> **Optimization:** derived fields used only in `select` are loaded via a deferred batch query (one extra query per derived field). When used in `where` or `orderBy`, they are joined eagerly via LEFT JOIN in the main query.

## Querying

### findMany / findFirst

```ts
const users = await r.users.findMany({
  select: { id: true, firstName: true },
  where: { email: { contains: '@example.com' } },
  orderBy: { field: 'firstName', order: 'asc' },
  limit: 10,
  offset: 0,
});

const user = await r.users.findFirst({
  where: { id: 1 },
});
```

### Operators

| Operator         | Example                                          | Description                                         |
| ---------------- | ------------------------------------------------ | --------------------------------------------------- |
| eq               | `{ name: 'John' }` or `{ name: { eq: 'John' } }` | Equal                                               |
| ne               | `{ name: { ne: 'John' } }`                       | Not equal                                           |
| gt, gte, lt, lte | `{ age: { gt: 18 } }`                            | Comparison                                          |
| in, notIn        | `{ id: { in: [1, 2, 3] } }`                      | Array membership                                    |
| like, notLike    | `{ email: { like: '%@gmail%' } }`                | Pattern match                                       |
| ilike, notIlike  | `{ name: { ilike: '%john%' } }`                  | Case-insensitive (PG native, MySQL/SQLite fallback) |
| contains         | `{ email: { contains: 'gmail' } }`               | Contains substring                                  |
| startsWith       | `{ name: { startsWith: 'Jo' } }`                 | Starts with                                         |
| endsWith         | `{ email: { endsWith: '.com' } }`                | Ends with                                           |
| isNull           | `{ deletedAt: { isNull: true } }`                | Is null                                             |
| isNotNull        | `{ email: { isNotNull: true } }`                 | Is not null                                         |
| arrayContains    | `{ tags: { arrayContains: ['ts'] } }`            | Array contains all (PG only)                        |
| arrayOverlaps    | `{ tags: { arrayOverlaps: ['ts', 'js'] } }`      | Array overlaps (PG only)                            |

### JSON Filtering

```ts
const admins = await r.users.findMany({
  where: {
    metadata: {
      role: 'admin',
      level: { gte: 5 },
      settings: { theme: 'dark' },
    },
  },
});
```

### Relation Filters

```ts
await r.users.findMany({
  where: { posts: { some: { published: true } } },
});

await r.users.findMany({
  where: { profile: { exists: true } },
});
```

### AND / OR / NOT

```ts
await r.users.findMany({
  where: {
    OR: [{ firstName: 'John' }, { AND: [{ role: 'admin' }, { active: true }] }],
    NOT: { email: { contains: 'spam' } },
  },
});
```

### Custom SQL ($raw)

```ts
await r.users.findMany({
  where: {
    $raw: ({ table, sql }) =>
      sql`${table.firstName} ILIKE ${'%john%'} OR ${table.lastName} ILIKE ${'%doe%'}`,
  },
});
```

## Relations

Relations are loaded via batch queries (`WHERE IN`), no N+1.

```ts
const usersWithPosts = await r.users.findMany({
  select: { id: true, firstName: true, posts: { id: true, title: true } },
});

const postsWithAuthor = await r.posts.findMany({
  select: { id: true, title: true, author: { firstName: true } },
});
```

## Aggregations

```ts
const count = await r.users.count();

const stats = await r.orders.aggregate({
  groupBy: ['status'],
  _count: true,
  _sum: { total: true },
  _avg: { total: true },
});

const byUser = await r.orders.aggregate({
  groupBy: ['user.firstName'],
  _count: true,
});
```

## Mutations

```ts
const user = await r.users.create({
  data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
});

const updated = await r.users.update({
  where: { id: 1 },
  data: { firstName: 'Jane' },
});

const deleted = await r.users.delete({ where: { id: 1 } });
```

## Transactions

```ts
await r.$transaction(async (tx) => {
  const user = await tx.users.create({
    data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  });
  await tx.orders.create({
    data: { userId: user.id, total: 100 },
  });
});
```

## Type Utilities

### From entity class (simplest)

```ts
import type { DotPaths, OrderByType, SelectType, WhereType } from '@relayerjs/drizzle';

// Works directly with your entity class
type UserSelect = SelectType<User>;
type UserWhere = WhereType<User>;
type UserPaths = DotPaths<User>;
type UserOrderBy = OrderByType<User>;

function findActiveUsers(where: WhereType<User>) {
  return r.users.findMany({ where: { ...where, active: true } });
}
```

### From client (full cross-entity resolution)

For relation dot paths and cross-entity computed/derived fields, use `InferModel`:

```ts
import type { DotPaths, InferModel, SelectType, WhereType } from '@relayerjs/drizzle';

type Post = InferModel<typeof r, 'posts'>;

type PostWhere = WhereType<Post>; // includes author.fullName, author.postsCount
type PostPaths = DotPaths<Post>; // "id" | "title" | "author.fullName" | "author.postsCount" | ...
type PostSelect = SelectType<Post>; // { author?: boolean | { fullName?: boolean; ... }; ... }
```

### From client (alternative)

```ts
import type { InferEntityOrderBy, InferEntitySelect, InferEntityWhere } from '@relayerjs/drizzle';

type UserWhere = InferEntityWhere<typeof r, 'users'>;
type UserSelect = InferEntitySelect<typeof r, 'users'>;
type UserOrderBy = InferEntityOrderBy<typeof r, 'users'>;
```

## License

MIT
