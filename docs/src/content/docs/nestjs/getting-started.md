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

### 2. Register the module

```ts
// app.module.ts
@Module({
  imports: [
    RelayerModule.forRoot({
      db,
      schema,
      entities: [UserEntity, PostEntity],
      defaultRelationLimit: 50,
      baseUrl: () => `http://localhost:${process.env.PORT ?? 3000}`,
    }),
    PostsModule,
  ],
})
export class AppModule {}
```

### 3. Create a controller

Minimal -- zero custom code:

```ts
// posts.controller.ts
@CrudController({ model: PostEntity })
export class PostsController extends RelayerController<PostEntity> {
  constructor(@InjectQueryService(PostEntity) service: RelayerService<PostEntity>) {
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

### 4. Feature module

```ts
@Module({
  imports: [RelayerModule.forFeature([PostEntity])],
  controllers: [PostsController],
})
export class PostsModule {}
```

## What's next

- [Search & filtering](/nestjs/search-and-filtering) -- how clients query your API
- [Configuration](/nestjs/configuration) -- defaults, restrictions, pagination mode
- [Validation](/nestjs/validation) -- Zod schemas, class-validator DTOs
- [DTO Mapper](/nestjs/dto-mapper) -- transform response shape
- [Hooks](/nestjs/hooks) -- side effects (notifications, cache)
- [Decorators & Guards](/nestjs/decorators) -- auth, per-route config
- [Dependency Injection](/nestjs/dependency-injection) -- services, cross-entity access
