<div align="center">
  <h1>⚡ Relayer</h1>
  <p><strong>Type-safe repository layer for ORMs.</strong><br/>
  Computed fields, derived fields, Prisma-like query DSL, and framework integrations.</p>

[![npm version](https://img.shields.io/npm/v/@relayerjs/drizzle.svg)](https://www.npmjs.com/package/@relayerjs/drizzle)
[![npm downloads](https://img.shields.io/npm/dm/@relayerjs/drizzle.svg)](https://www.npmjs.com/package/@relayerjs/drizzle)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

</div>

## Packages

| Package                                          | Description                                     |
| ------------------------------------------------ | ----------------------------------------------- |
| [@relayerjs/drizzle](./packages/drizzle)         | Drizzle ORM adapter — main package              |
| [@relayerjs/core](./packages/core)               | ORM-agnostic types and contracts                |
| [@relayerjs/next](./packages/next)               | Next.js App Router CRUD integration             |
| [@relayerjs/nestjs-crud](./packages/nestjs-crud) | NestJS CRUD controllers with DI, hooks, Swagger |

## Table of Contents

- [Why Relayer?](#why-relayer)
- [Features](#features)
- [Quick Start](#quick-start)
- [Next.js Integration](#nextjs-integration)
- [NestJS Integration](#nestjs-integration)
- [Documentation](#documentation)
- [Examples](#examples)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why Relayer?

Relayer is a repository layer that sits between your ORM and your API. It makes dynamic fields (computed, derived) a first-class part of the data model with full support for filtering, sorting, and aggregation — not through raw SQL escape hatches, but as a core design principle. The query DSL is a plain JSON-serializable object, making it trivial to wire up as REST or GraphQL filters.

Currently ships with a [Drizzle ORM](https://orm.drizzle.team) adapter and framework integrations for [Next.js](./packages/next) and [NestJS](./packages/nestjs-crud). The project is in active development — adapters for Kysely, TypeORM, and other ORMs are planned.

## Features

### Core / Drizzle

- **First-class dynamic fields** — computed, derived, and JSON fields are type-safe, filterable, sortable, and selectable — treated equally to regular columns
- **Complex filtering** — AND, OR, NOT, relation filters (some, every, none), custom SQL in where, 20+ operators
- **Relations** — batch loading without N+1, per-relation row limits (`$limit`), connect/disconnect/set for managing relations in mutations
- **Aggregations** — \_count, \_sum, \_avg, \_min, \_max with groupBy and having — full support for computed, derived, and JSON fields
- **Type-safe autocomplete** — full inference for own fields, nested relations, and even nested derived fields across entities
- **Prisma-like query DSL** — findMany, findFirst, where, select, orderBy — JSON-serializable, ready for REST/GraphQL
- **Transactions** — `$transaction` with automatic wrapping for relation operations
- **Typed context** — pass per-request data (user, tenant) to field resolvers for row-level logic
- **Multi-dialect** — PostgreSQL, MySQL, SQLite with dialect-aware optimizations

### Next.js

- **Type-safe App Router route handlers** (GET, POST, PATCH, DELETE)
- **Built-in validation** (Zod) and lifecycle hooks
- **SSR direct calls** — same Relayer client, no HTTP roundtrip
- **Configurable field whitelists**, operator restrictions, and pagination limits

### NestJS

- **Full-featured REST CRUD** — services, controllers, and route generation out of the box
- **Lifecycle hooks** and **DTO mapping** for full control over request/response pipeline
- **Complex filters** — AND, OR, relations, JSON fields, computed/derived fields, search
- **Cursor and offset pagination** with configurable limits
- **Swagger/OpenAPI** auto-documentation

## Quick Start

```bash
npm install @relayerjs/drizzle drizzle-orm
```

### Define entities

```ts
import { createRelayerDrizzle, createRelayerEntity } from '@relayerjs/drizzle';

import { db } from './db';
import * as schema from './schema'; // your Drizzle schema

const UserEntity = createRelayerEntity(schema, 'users');

class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  fullName!: string;

  @UserEntity.derived({
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({ [field()]: sql`count(*)::int`, userId: s.posts.authorId })
        .from(s.posts)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.userId),
  })
  postsCount!: number;
}

const r = createRelayerDrizzle({
  db,
  schema,
  entities: { users: User },
});
```

### Query

```ts
const users = await r.users.findMany({
  select: { id: true, fullName: true, postsCount: true },
  where: { email: { contains: '@example.com' } },
  orderBy: { field: 'postsCount', order: 'desc' },
  limit: 10,
});

// JSON filtering
const admins = await r.users.findMany({
  where: { metadata: { role: 'admin', level: { gte: 5 } } },
});

// Relations with per-relation row limit
const usersWithPosts = await r.users.findMany({
  select: { id: true, fullName: true, posts: { $limit: 5, title: true } },
});

// Aggregations
const stats = await r.orders.aggregate({
  groupBy: ['status'],
  _count: true,
  _sum: { total: true },
});
```

> For the full API reference (mutations, transactions, relations, type utilities), see the [@relayerjs/drizzle README](./packages/drizzle/README.md).

## Next.js Integration

[@relayerjs/next](./packages/next) turns your Relayer entities into type-safe App Router route handlers with validation, hooks, and SSR support.

```bash
npm install @relayerjs/next @relayerjs/core @relayerjs/drizzle drizzle-orm next
```

```ts
// lib/routes.ts
import { createRelayerRoute } from '@relayerjs/next';

export const userRoutes = createRelayerRoute(r, 'users', {
  allowWhere: { email: { operators: ['eq', 'contains'] } },
  allowOrderBy: ['name', 'createdAt', 'postsCount'],
  maxLimit: 100,
});

// app/api/users/route.ts
export const GET = userRoutes.list({
  defaultSelect: { id: true, name: true, postsCount: true },
  defaultOrderBy: { field: 'createdAt', order: 'desc' },
});
export const POST = userRoutes.create();

// app/api/users/[id]/route.ts
export const { GET, PATCH, DELETE } = userRoutes.detailHandlers();
```

> Full documentation: [@relayerjs/next README](./packages/next/README.md)

## NestJS Integration

[@relayerjs/nestjs-crud](./packages/nestjs-crud) provides DI-native services and auto-generated CRUD controllers with lifecycle hooks, DTO mapping, Swagger, and cursor/offset pagination.

```bash
npm install @relayerjs/nestjs-crud @relayerjs/core @relayerjs/drizzle drizzle-orm
```

```ts
@Injectable()
export class PostsService extends RelayerService<PostEntity, EM> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, PostEntity);
  }
}

@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    list: {
      defaults: { orderBy: { field: 'createdAt', order: 'desc' } },
      maxLimit: 50,
      defaultLimit: 20,
    },
    create: { schema: createPostSchema },
    update: { schema: updatePostSchema },
  },
})
export class PostsController extends RelayerController<PostEntity, EM> {
  constructor(postsService: PostsService) {
    super(postsService);
  }
}
```

Auto-generated routes:

| Method   | Path                         | Description                                      |
| -------- | ---------------------------- | ------------------------------------------------ |
| `GET`    | `/posts`                     | List with pagination, filtering, sorting, search |
| `GET`    | `/posts/:id`                 | Find by ID                                       |
| `POST`   | `/posts`                     | Create (validated)                               |
| `PATCH`  | `/posts/:id`                 | Update (validated)                               |
| `DELETE` | `/posts/:id`                 | Delete                                           |
| `GET`    | `/posts/count`               | Count matching records                           |
| `GET`    | `/posts/aggregate`           | Aggregation with groupBy                         |
| `POST`   | `/posts/:id/relations/:name` | Connect relation                                 |
| `DELETE` | `/posts/:id/relations/:name` | Disconnect relation                              |

> Full documentation: [@relayerjs/nestjs-crud README](./packages/nestjs-crud/README.md)

## Documentation

Full documentation is available at **[relayerjs.vercel.app](https://relayerjs.vercel.app)**

| Topic               | Link                                                               |
| ------------------- | ------------------------------------------------------------------ |
| Drizzle adapter     | [packages/drizzle/README.md](./packages/drizzle/README.md)         |
| Next.js integration | [packages/next/README.md](./packages/next/README.md)               |
| NestJS CRUD         | [packages/nestjs-crud/README.md](./packages/nestjs-crud/README.md) |

## Examples

| Example                             | Directory                                      |
| ----------------------------------- | ---------------------------------------------- |
| Drizzle (PostgreSQL, MySQL, SQLite) | [examples/drizzle](./examples/drizzle)         |
| NestJS CRUD                         | [examples/nestjs-crud](./examples/nestjs-crud) |
| Next.js App Router                  | [examples/next](./examples/next)               |

## Roadmap

Relayer is in early development. Planned packages:

- **@relayerjs/rest**: auto-generate REST CRUD endpoints (Express, Fastify)
- **@relayerjs/nestjs-graphql**: NestJS GraphQL resolvers with auto-generated schemas
- **@relayerjs/react**: React client with hooks for querying Relayer endpoints

Contributions are always welcome.

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

<details>
<summary>Run examples</summary>

```bash
cd examples
docker compose up -d        # start PostgreSQL + MySQL
cd drizzle
pnpm seed                   # create tables + seed data
pnpm start                  # run PG example
npx tsx src/test-mysql.ts   # run MySQL example
npx tsx src/test-sqlite.ts  # run SQLite example
```

</details>

<details>
<summary>Run tests</summary>

```bash
pnpm -r test                                   # all packages (requires Docker for integration tests)
pnpm --filter @relayerjs/drizzle test:unit     # drizzle unit tests only (no DB)
pnpm --filter @relayerjs/drizzle test:pg       # drizzle PostgreSQL integration
pnpm --filter @relayerjs/drizzle test:mysql    # drizzle MySQL integration
pnpm --filter @relayerjs/drizzle test:sqlite   # drizzle SQLite integration (in-memory)
pnpm --filter @relayerjs/nestjs-crud test      # nestjs-crud
pnpm --filter @relayerjs/next test             # next
```

</details>

<details>
<summary>Run docs locally</summary>

```bash
pnpm docs:dev    # start dev server at localhost:4321
pnpm docs:build  # production build
```

</details>

## License

[MIT](./LICENSE)
