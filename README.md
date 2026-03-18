# Relayer

Type-safe repository layer for ORMs with computed fields, derived fields, and a powerful query DSL. Currently supports [Drizzle ORM](https://orm.drizzle.team).

[![npm version](https://img.shields.io/npm/v/@relayerjs/drizzle.svg)](https://www.npmjs.com/package/@relayerjs/drizzle)
[![npm downloads](https://img.shields.io/npm/dm/@relayerjs/drizzle.svg)](https://www.npmjs.com/package/@relayerjs/drizzle)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

## Why Relayer?

Over the years, across many projects, we kept reimplementing the same pattern: a repository layer that brings database queries closer to API filters and makes dynamic fields (computed, derived) a first-class part of the data model -- with full support for filtering, sorting, and aggregation. Not as an afterthought, not through raw SQL escape hatches, but as a core design principle.

Relayer is that pattern extracted into a library. Built with **API integration in mind** from day one:

- **API-friendly query DSL** -- `findMany`, `where`, `select`, `orderBy` with 20+ operators. The DSL is a plain JSON-serializable object, making it trivial to wire up as REST/GraphQL filters
- **Computed fields** -- virtual SQL expressions, no raw queries
- **Derived fields** -- automatic subquery JOINs with full filtering and sorting support
- **First-class JSON filtering** -- nested path queries with full comparison operators
- **Typed context** -- pass per-request data (current user, tenant, etc.) to field resolvers

## Features

- **Query DSL** -- select, where, orderBy, limit, offset
- **Computed fields** -- virtual columns defined as SQL expressions
- **Derived fields** -- automatic subquery JOINs (scalar and object types)
- **First-class JSON integration** -- transparent nested filtering with auto type casting
- **20+ filter operators** -- eq, ne, gt, gte, lt, lte, in, contains, ilike, isNull, and more
- **Array operators** -- arrayContains, arrayContained, arrayOverlaps (PostgreSQL)
- **Relation filters** -- $exists, $some, $every, $none
- **Aggregations** -- \_count, \_sum, \_avg, \_min, \_max with groupBy and dot-notation
- **Typed context** -- pass per-query context to computed/derived resolvers
- **Transactions** -- $transaction with automatic client scoping
- **Multi-dialect** -- PostgreSQL, MySQL, SQLite
- **Full TypeScript inference** -- select, where, orderBy, and result types

Currently only [Drizzle ORM](https://orm.drizzle.team) (`>=0.38.0`) is supported. Drizzle v1 is currently in beta -- Relayer will add support for it once v1 reaches a stable release. Future plans also include adapters for TypeORM, Kysely, MikroORM, and others -- the goal is a single unified query interface regardless of the underlying ORM. Contributions are always welcome.

## Quick Start

```bash
npm install @relayerjs/drizzle drizzle-orm
```

### Define your Drizzle schema

```ts
import { relations } from 'drizzle-orm';
import { integer, jsonb, pgTable, serial, text } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  metadata: jsonb('metadata').$type<{ role: string; level: number }>(),
});

const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  published: boolean('published').default(false).notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
});

const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

const schema = { users, posts, usersRelations, postsRelations };
```

### Create the Relayer client

```ts
import { createRelayerDrizzle, FieldType } from '@relayerjs/drizzle';

interface AppContext {
  currentUserId: number;
}

const r = createRelayerDrizzle({
  db, // your drizzle instance
  schema,
  context: {} as AppContext,
  entities: {
    users: {
      fields: {
        // Computed: virtual SQL expression with per-request context
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
          query: ({ db, schema: s, sql, field }) =>
            db
              .select({ [field()]: sql`count(*)::int`, userId: s.posts.authorId })
              .from(s.posts)
              .groupBy(s.posts.authorId),
          on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
        },
        // Derived: object-type subquery (multi-value)
        orderStats: {
          type: FieldType.Derived,
          valueType: { totalAmount: 'string', orderCount: 'number' },
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
        },
      },
    },
  },
});
```

### Query with Prisma-like DSL

```ts
// Select + filter + order
const results = await r.users.findMany({
  select: { id: true, firstName: true, isMe: true, postsCount: true },
  where: { email: { contains: '@example.com' } },
  orderBy: { field: 'firstName', order: 'asc' },
  context: { currentUserId: 1 },
  limit: 10,
});

// Filter and sort by object-type derived fields
const topSpenders = await r.users.findMany({
  select: { id: true, firstName: true, orderStats: { totalAmount: true, orderCount: true } },
  where: { orderStats: { orderCount: { gte: 1 } } },
  orderBy: { field: 'orderStats.totalAmount', order: 'desc' }, // type-safe dot notation! 🎉
});

// JSON filtering -- transparent nested queries
const admins = await r.users.findMany({
  where: { metadata: { role: 'admin', level: { gte: 5 } } },
});

// Load relations
const usersWithPosts = await r.users.findMany({
  select: { id: true, firstName: true, posts: { title: true } },
});

// Relation filters
const activeAuthors = await r.users.findMany({
  where: { posts: { $some: { published: true } } },
});

// Aggregations -- all functions + groupBy + dot-notation joins
const stats = await r.orders.aggregate({
  groupBy: ['status'],
  _count: true,
  _sum: { total: true },
  _avg: { total: true },
  _min: { total: true },
  _max: { total: true },
});
// [{ status: 'completed', _count: 3, _sum_total: 5000, _avg_total: 1666, _min_total: 500, _max_total: 3000 }, ...]

// Group by relation field (auto LEFT JOIN)
const ordersByUser = await r.orders.aggregate({
  groupBy: ['user.firstName'],
  _count: true,
  _sum: { total: true },
});
```

## Packages

| Package                                  | Description                         |
| ---------------------------------------- | ----------------------------------- |
| [@relayerjs/drizzle](./packages/drizzle) | Drizzle ORM adapter -- main package |
| [@relayerjs/core](./packages/core)       | ORM-agnostic types and contracts    |

## Documentation

Full documentation is available at **[relayerjs.vercel.app](https://relayerjs.vercel.app)**

See also the [Drizzle adapter README](./packages/drizzle/README.md) for a quick API reference.

## Examples

See the [examples/drizzle](./examples/drizzle) directory for runnable examples with PostgreSQL, MySQL, and SQLite.

## Roadmap

Relayer is in early development. Planned packages:

- **@relayerjs/rest** -- auto-generate REST CRUD endpoints (Express, Fastify, Hono)
- **@relayerjs/next** -- Next.js API route handlers and server actions
- **@relayerjs/nest** -- NestJS module with CRUD controllers and GraphQL resolvers
- **@relayerjs/graphql** -- standalone GraphQL schema generation
- **@relayerjs/react** -- React client with hooks for querying Relayer endpoints

## Contributing

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker (for PostgreSQL and MySQL integration tests)

### Setup

```bash
git clone https://github.com/awHamer/relayer.git
cd relayer
pnpm install
pnpm build
```

### Run examples

```bash
cd examples
docker compose up -d        # start PostgreSQL + MySQL
cd drizzle
pnpm seed                   # create tables + seed data
pnpm start                  # run PG example
npx tsx src/test-mysql.ts   # run MySQL example
npx tsx src/test-sqlite.ts  # run SQLite example
```

### Run tests

```bash
pnpm --filter @relayerjs/drizzle test        # all tests
pnpm --filter @relayerjs/drizzle test:unit   # unit tests only (no DB)
pnpm --filter @relayerjs/drizzle test:pg     # PostgreSQL integration
pnpm --filter @relayerjs/drizzle test:mysql  # MySQL integration
pnpm --filter @relayerjs/drizzle test:sqlite # SQLite integration (in-memory)
```

### Run docs locally

```bash
pnpm docs:dev    # start dev server at localhost:4321
pnpm docs:build  # production build
```

## Inspiration

Relayer is inspired by Prisma query API, Hasura GraphQL filters, nestjs-query, and many other tools that make database access feel effortless.

## License

[MIT](./LICENSE)
