---
title: 'NestJS GraphQL: Getting Started'
description: Code-first GraphQL CRUD with auto-generated schemas, filtering, and dual pagination.
---

## What you get

Drop `@relayerjs/nestjs-graphql` into a NestJS project and get a complete code-first GraphQL API:

- **Full CRUD** - queries (list, findById, count, aggregate) and mutations (create, update, delete)
- **Auto-generated types** - ObjectType, WhereInput, OrderByInput, CreateInput, UpdateInput, Connection, Edge, PageInfo
- **Dual pagination** - cursor-based (Relayer connections) and offset-based, or both at once
- **Rich filtering** - per-type operators, AND/OR/NOT combinators, relation filters (some/every/none)
- **Ordering** - multi-field sorting, nested relation ordering
- **Aggregation** - groupBy, count, sum, avg, min, max
- **Selection optimization** - only fetches fields the client actually requested
- **Lifecycle hooks** - beforeCreate, afterFind, etc.
- **Typed context** - extract request data and use it for row-level scoping

All type-safe, all configurable.

## Installation

```bash
npm install @relayerjs/nestjs-graphql @relayerjs/core @relayerjs/drizzle @relayerjs/nestjs-common
```

Assumes a working NestJS GraphQL setup (`@nestjs/graphql`, `@nestjs/apollo`, `graphql`, `graphql-scalars`).

## Quick start

### 1. Define your entity

```ts
// entities/post.entity.ts
import { createRelayerEntity } from '@relayerjs/drizzle';

import * as schema from '../schema';

export class PostEntity extends createRelayerEntity(schema, 'posts') {}
```

Need computed fields? Extend the class:

```ts
const UserBase = createRelayerEntity(schema, 'users');

export class UserEntity extends UserBase {
  @UserBase.computed({
    resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  fullName!: string;
}
```

### 2. Create an entity map

```ts
// entities/entity-map.ts
export const entities = { users: UserEntity, posts: PostEntity };
export type EM = typeof entities;
```

### 3. Register the module

```ts
// app.module.ts
import { RelayerGraphqlModule } from '@relayerjs/nestjs-graphql';

@Module({
  imports: [
    RelayerGraphqlModule.forRoot({
      db,
      schema,
      entities: [UserEntity, PostEntity],
      defaultRelationLimit: 50,
    }),
    UsersModule,
    PostsModule,
  ],
})
export class AppModule {}
```

### 4. Create a service

```ts
@Injectable()
export class UsersService extends RelayerService<UserEntity, EM> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, UserEntity);
  }
}
```

### 5. Create a resolver

```ts
import { GqlResolver, RelayerResolver } from '@relayerjs/nestjs-graphql';

@GqlResolver(UserEntity, { name: 'User' })
export class UsersResolver extends RelayerResolver<UserEntity, EM> {
  constructor(usersService: UsersService) {
    super(usersService);
  }
}
```

That's it. One decorator, full GraphQL CRUD:

| Type     | Name                       | Description                        |
| -------- | -------------------------- | ---------------------------------- |
| Query    | `users`                    | Cursor-paginated list (Connection) |
| Query    | `user(id: ID!)`            | Find by ID                         |
| Query    | `usersCount(where: ...)`   | Count matching records             |
| Query    | `usersAggregate(...)`      | Aggregation with groupBy           |
| Mutation | `createUser(data: ...)`    | Create one                         |
| Mutation | `updateUser(id: ID!, ...)` | Update one                         |
| Mutation | `deleteUser(id: ID!)`      | Delete one                         |

All GraphQL types are generated automatically: `User`, `UserWhereInput`, `UserOrderByInput`, `CreateUserInput`, `UpdateUserInput`, `UserConnection`, `UserEdge`, `PageInfo`, `UserAggregate`, plus scalar filter inputs.

## What's next

For the full API reference (resolver configuration, pagination modes, filtering operators, hooks, typed context, field selection), see the [@relayerjs/nestjs-graphql README](https://github.com/awHamer/relayer/tree/main/packages/nestjs-graphql).
