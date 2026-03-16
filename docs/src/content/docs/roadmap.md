---
title: Roadmap
description: Planned packages and future direction for Relayer.
---

Relayer is in early development. The core query layer (`@relayerjs/drizzle`) is stable and usable. Future packages will build on top of it to provide end-to-end CRUD automation.

## Current packages

| Package | Status | Description |
|---|---|---|
| `@relayerjs/core` | Published | ORM-agnostic types and contracts |
| `@relayerjs/drizzle` | Published | Drizzle ORM adapter with full query DSL |

## Planned packages

### @relayerjs/rest

Auto-generate REST CRUD endpoints from your Relayer entities. Planned framework support:

- Express
- Fastify
- Hono

The query DSL is already JSON-serializable, making it straightforward to accept `where`, `select`, `orderBy` as query parameters or request body fields.

### @relayerjs/next

Next.js integration with:

- API route handlers
- Server actions
- Type-safe client-server communication

### @relayerjs/nest

NestJS module providing:

- CRUD controllers with automatic routing
- GraphQL resolvers
- Decorator-based configuration

### @relayerjs/graphql

Standalone GraphQL schema generation from Relayer entities:

- Auto-generated types, queries, and mutations
- Filter input types matching the Relayer DSL
- Relation loading via DataLoader pattern

### @relayerjs/react

React client library with hooks for querying Relayer endpoints:

- `useQuery` / `useMutation` hooks
- Type-safe integration with `@relayerjs/rest` or `@relayerjs/next`
- Optimistic updates and cache management

## Future ORM adapters

The long-term goal is a single unified query interface regardless of the underlying ORM. Potential future adapters:

- TypeORM
- Kysely
- MikroORM
- Prisma (as an alternative query layer)

## Contributing

Contributions are welcome. If you are interested in any of the planned packages, open an issue on GitHub to discuss the approach before starting work.
