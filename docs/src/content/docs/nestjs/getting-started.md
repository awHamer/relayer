---
title: 'NestJS: Getting Started'
description: Zero-boilerplate CRUD API with filtering, search, pagination, and relations out of the box.
---

## What you get

Drop `@relayerjs/nestjs-crud` into a NestJS project and get a production-ready REST API:

- **Full CRUD** -- list, get by id, create, update, delete, count
- **Filtering** -- `?where={"published":true}` with 20+ operators
- **Search** -- `?search=hello` across multiple fields
- **Pagination** -- offset or cursor-based, with `nextPageUrl`
- **Relations** -- load nested data: `?select={"comments":{"id":true}}`
- **Validation** -- Zod or class-validator, unified error format
- **Auth** -- guards and decorators per route

All type-safe, all configurable, all overridable.

## Installation

```bash
npm install @relayerjs/nestjs-crud @relayerjs/drizzle drizzle-orm
```

Assumes you already have a NestJS project with `@nestjs/common`, `@nestjs/core`, etc.

## Quick start (5 minutes)

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

The entity map ties your entity classes together and enables cross-entity type inference:

```ts
// entities/entity-map.ts
import { PostEntity } from './post.entity';
import { UserEntity } from './user.entity';

export const entities = { users: UserEntity, posts: PostEntity };
export type EM = typeof entities;
```

### 3. Register the module

Call `RelayerModule.forRoot()` once in your root `AppModule`. This creates the Relayer client, registers entity providers, and makes everything available globally:

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { RelayerModule } from '@relayerjs/nestjs-crud';

import { db } from './db';
import { PostEntity, UserEntity } from './entities';
import * as schema from './schema';

@Module({
  imports: [
    RelayerModule.forRoot({
      db, // your Drizzle db instance
      schema, // Drizzle schema export (tables + relations)
      entities: [UserEntity, PostEntity],
      defaultRelationLimit: 50,
      baseUrl: () => `http://localhost:${process.env.PORT ?? 3000}`,
    }),
    PostsModule,
  ],
})
export class AppModule {}
```

For dynamic configuration (e.g. reading DB URL from environment):

```ts
RelayerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    db: createDb(config.get('DATABASE_URL')),
    schema,
    entities: [UserEntity, PostEntity],
  }),
});
```

### 4. Create a controller

Minimal -- zero custom code:

```ts
// posts.controller.ts
@CrudController<PostEntity, EM>({ model: PostEntity })
export class PostsController extends RelayerController<PostEntity, EM> {
  constructor(@InjectQueryService(PostEntity) service: RelayerService<PostEntity, EM>) {
    super(service);
  }
}
```

That's it. You now have:

```
GET    /posts             -- list with filtering, search, pagination
GET    /posts/:id         -- get by id
POST   /posts             -- create
PATCH  /posts/:id         -- update
DELETE /posts/:id         -- delete
GET    /posts/count       -- count with filtering
```

### 5. Feature module

```ts
@Module({
  imports: [RelayerModule.forFeature([PostEntity])],
  controllers: [PostsController],
})
export class PostsModule {}
```

## What's next

**API Reference:**

- [CRUD Controller](/nestjs/crud-controller) -- routes, defaults, access control, decorators, pagination
- [Query Service](/nestjs/query-service) -- service methods, defaults, cross-entity access, DI
- [Hooks](/nestjs/hooks) -- lifecycle hooks for side effects
- [Data Mapper](/nestjs/data-mapper) -- transform response shapes

**Usage:**

- [Search & Filtering](/nestjs/search-and-filtering) -- how clients query your API
- [Aggregations](/nestjs/aggregations) -- groupBy, count, sum, avg, min, max
- [Validation](/nestjs/validation) -- Zod schemas, class-validator DTOs
