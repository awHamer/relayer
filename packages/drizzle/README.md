# @relayerjs/drizzle

Drizzle ORM adapter for Relayer -- type-safe repository layer with computed fields, derived fields, and query DSL.

## Installation

```bash
npm install @relayerjs/drizzle drizzle-orm
```

## Setup

```ts
import { createRelayerDrizzle, FieldType } from '@relayerjs/drizzle';
import { db } from './db';
import * as schema from './schema';

interface AppContext {
  currentUserId: number;
}

const r = createRelayerDrizzle({
  db,
  schema,
  context: {} as AppContext,
  entities: {
    users: {
      fields: {
        // Computed: virtual SQL expression
        fullName: {
          type: FieldType.Computed,
          valueType: 'string',
          resolve: ({ table, sql }) =>
            sql`${table.firstName} || ' ' || ${table.lastName}`,
        },
        // Computed with context
        isMe: {
          type: FieldType.Computed,
          valueType: 'boolean',
          resolve: ({ table, sql, context }) =>
            sql`CASE WHEN ${table.id} = ${context.currentUserId} THEN true ELSE false END`,
        },
        // Derived: scalar subquery
        postsCount: {
          type: FieldType.Derived,
          valueType: 'number',
          query: ({ db, schema: s, sql }) =>
            db.select({ postsCount: sql`count(*)::int`, userId: s.posts.authorId })
              .from(s.posts)
              .groupBy(s.posts.authorId),
          on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
        },
        // Derived: object-type subquery
        orderSummary: {
          type: FieldType.Derived,
          valueType: { totalAmount: 'string', orderCount: 'number' },
          query: ({ db, schema: s, sql }) =>
            db.select({
                orderSummary_totalAmount: sql`COALESCE(sum(${s.orders.total}), 0)::text`,
                orderSummary_orderCount: sql`count(*)::int`,
                userId: s.orders.userId,
              })
              .from(s.orders)
              .groupBy(s.orders.userId),
          on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
        },
      },
    },
  },
});
```

All fields are defined inside `entities.<tableName>.fields` in the `createRelayerDrizzle` call. There are two kinds:

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
- `query` -- a function that builds a Drizzle subquery (receives `{ db, schema, sql, context }`)
- `on` -- a function that defines the JOIN condition (receives `{ parent, derived, eq }`)

### Scalar derived

When `valueType` is a scalar (e.g. `'number'`), the result is a single value:

```ts
const users = await r.users.findMany({
  select: { id: true, firstName: true, postsCount: true },
});
// [{ id: 1, firstName: 'John', postsCount: 3 }, ...]
```

### Object-type derived

When `valueType` is an object, the result is a nested object. Sub-fields in the subquery must be prefixed with `fieldName_`:

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

| Operator | Example | Description |
|---|---|---|
| eq | `{ name: 'John' }` or `{ name: { eq: 'John' } }` | Equal |
| ne | `{ name: { ne: 'John' } }` | Not equal |
| gt, gte, lt, lte | `{ age: { gt: 18 } }` | Comparison |
| in, notIn | `{ id: { in: [1, 2, 3] } }` | Array membership |
| like, notLike | `{ email: { like: '%@gmail%' } }` | Pattern match |
| ilike, notIlike | `{ name: { ilike: '%john%' } }` | Case-insensitive (PG native, MySQL/SQLite fallback) |
| contains | `{ email: { contains: 'gmail' } }` | Contains substring |
| startsWith | `{ name: { startsWith: 'Jo' } }` | Starts with |
| endsWith | `{ email: { endsWith: '.com' } }` | Ends with |
| isNull | `{ deletedAt: { isNull: true } }` | Is null |
| isNotNull | `{ email: { isNotNull: true } }` | Is not null |
| arrayContains | `{ tags: { arrayContains: ['ts'] } }` | Array contains all (PG only) |
| arrayOverlaps | `{ tags: { arrayOverlaps: ['ts', 'js'] } }` | Array overlaps (PG only) |

### JSON Filtering

Transparent nested filtering on JSON columns:

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

Numeric and boolean comparisons are auto-cast to the correct types.

### Relation Filters

```ts
// Users who have at least one published post
await r.users.findMany({
  where: { posts: { $some: { published: true } } },
});

// Users who have a profile
await r.users.findMany({
  where: { profile: { $exists: true } },
});

// $every, $none also available
await r.users.findMany({
  where: { posts: { $every: { published: true } } },
});

await r.users.findMany({
  where: { posts: { $none: { spam: true } } },
});
```

### AND / OR / NOT

```ts
await r.users.findMany({
  where: {
    OR: [
      { firstName: 'John' },
      { AND: [{ role: 'admin' }, { active: true }] },
    ],
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

Relations are loaded via batch queries (`WHERE IN`) -- no N+1.

```ts
// One-to-many
const usersWithPosts = await r.users.findMany({
  select: { id: true, firstName: true, posts: { id: true, title: true } },
});
// [{ id: 1, firstName: 'John', posts: [{ id: 1, title: '...' }] }]

// Many-to-one
const postsWithAuthor = await r.posts.findMany({
  select: { id: true, title: true, author: { firstName: true } },
});

// Deep nesting
const data = await r.users.findMany({
  select: {
    id: true,
    posts: { title: true, comments: { content: true } },
  },
});
```

## Aggregations

```ts
// Count all
const count = await r.users.count();

// Count with filter
const filtered = await r.users.count({ where: { role: 'admin' } });

// Aggregation with groupBy
const stats = await r.orders.aggregate({
  groupBy: ['status'],
  _count: true,
  _sum: { total: true },
  _avg: { total: true },
});
// [{ status: 'completed', _count: 3, _sum_total: 5000, _avg_total: 1666 }, ...]

// Dot-notation groupBy (joins relation)
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

const users = await r.users.createMany({
  data: [
    { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
  ],
});

const updated = await r.users.update({
  where: { id: 1 },
  data: { firstName: 'Jane' },
});

const result = await r.users.updateMany({
  where: { role: 'guest' },
  data: { active: false },
});
// result.count === number of updated rows

const deleted = await r.users.delete({ where: { id: 1 } });

const result = await r.users.deleteMany({ where: { active: false } });
// result.count === number of deleted rows
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
  // Automatically committed. Throw to rollback.
});
```

## Context

Pass per-query context to computed and derived field resolvers.

```ts
const r = createRelayerDrizzle({
  db,
  schema,
  entities: {
    users: {
      fields: {
        isCurrentUser: {
          type: FieldType.Computed,
          valueType: 'boolean',
          resolve: ({ table, sql, context }) =>
            sql`CASE WHEN ${table.id} = ${context.userId} THEN true ELSE false END`,
        },
      },
    },
  },
});

const users = await r.users.findMany({
  select: { id: true, isCurrentUser: true },
  context: { userId: currentUser.id },
});
```

## Multi-Dialect Support

Relayer detects the dialect from your Drizzle schema and adjusts SQL generation accordingly.

| Feature | PostgreSQL | MySQL | SQLite |
|---|---|---|---|
| ilike | Native `ILIKE` | `LOWER() LIKE LOWER()` | `LIKE COLLATE NOCASE` |
| Array operators | Native (`@>`, `&&`) | Not supported | Not supported |
| JSON path | `->>` with `::cast` | `->>` with `CAST()` | `json_extract()` with `CAST()` |
| RETURNING | Yes | No (`insertId` fallback) | Yes |

## Escape Hatch

Access the underlying Drizzle instance when you need to drop down to raw Drizzle queries.

```ts
const db = r.$orm;
// or
const db = r.getOrm();

const result = await db.select().from(users).where(...);
```

## Type Utilities

Extract `Where`, `Select`, and `OrderBy` types for any entity from your Relayer client. Useful for building custom methods, API handlers, or reusable query helpers.

```ts
import type { InferEntityWhere, InferEntitySelect, InferEntityOrderBy } from '@relayerjs/drizzle';

// Extract types from your client instance
type UserWhere = InferEntityWhere<typeof r, 'users'>;
type UserSelect = InferEntitySelect<typeof r, 'users'>;
type UserOrderBy = InferEntityOrderBy<typeof r, 'users'>;

// Use in custom functions
function findActiveUsers(where: UserWhere) {
  return r.users.findMany({
    where: { ...where, active: true },
  });
}

// Use in API handlers
app.get('/users', (req, res) => {
  const where: UserWhere = req.query.filter;
  const orderBy: UserOrderBy = req.query.sort;
  return r.users.findMany({ where, orderBy });
});
```

These types include everything: scalar columns, computed fields, derived fields (with object dot-notation), relation filters, AND/OR/NOT, and $raw.

## License

MIT
