---
title: Roadmap
description: Current state and future direction for Relayer.
---

Relayer is in early development. The core query layer is stable and usable. Future packages will build on top of it to provide end-to-end CRUD automation.

## Current packages

| Package              | Status    | Description                                   |
| -------------------- | --------- | --------------------------------------------- |
| `@relayerjs/core`    | Published | ORM-agnostic types, contracts, and decorators |
| `@relayerjs/drizzle` | Published | Drizzle ORM adapter with full query DSL       |
| `@relayerjs/next`    | Published | Next.js App Router integration                |

## Recent changes

### Class-based entity model (v0.4)

Entity definitions moved from config objects to class-based models with decorators:

```ts
const UserEntity = createRelayerEntity(schema, 'users');

class User extends UserEntity {
  @UserEntity.computed({ resolve: ({ table, sql }) => sql`...` })
  fullName!: string;

  @UserEntity.derived({ query: ..., on: ... })
  postsCount!: number;
}
```

This replaces the previous `{ fields: { fullName: { type: FieldType.Computed, ... } } }` config.

## Planned packages

### @relayerjs/rest

Auto-generate REST CRUD endpoints from your Relayer entities. Planned framework support: Express, Fastify, Hono.

The query DSL is already JSON-serializable, making it straightforward to accept `where`, `select`, `orderBy` as query parameters or request body fields.

### @relayerjs/nest

NestJS module providing: CRUD controllers with automatic routing, GraphQL resolvers, decorator-based configuration.

### @relayerjs/graphql

Standalone GraphQL schema generation from Relayer entities: auto-generated types, queries, and mutations, filter input types matching the Relayer DSL, relation loading via DataLoader pattern.

### @relayerjs/react

React client library with hooks for querying Relayer endpoints: `useQuery` / `useMutation` hooks, type-safe integration with `@relayerjs/rest` or `@relayerjs/next`, optimistic updates and cache management.

## Future ORM adapters

The long-term goal is a single unified query interface regardless of the underlying ORM. Potential future adapters:

- TypeORM
- Kysely
- MikroORM
- Prisma (as an alternative query layer)

## Contributing

Contributions are welcome. If you are interested in any of the planned packages, open an issue on GitHub to discuss the approach before starting work.
