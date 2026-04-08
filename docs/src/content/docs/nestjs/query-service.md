---
title: 'NestJS: Query Service'
description: Type-safe CRUD service with defaults, cross-entity access, and DI.
---

`RelayerService<TEntity, TEntities>` is the data layer. It wraps a Relayer entity repository with typed CRUD methods and applies business-level defaults. Services work everywhere: controllers, cron jobs, event handlers, tests.

## Module setup

See [Getting Started](/nestjs/getting-started#3-register-the-module) for `RelayerModule.forRoot()`, `forRootAsync()`, and `forFeature()` setup.

## Entity map

The entity map ties your entity classes together and enables relation-aware type inference across the entire application:

```ts
// entities/entity-map.ts
import { CommentEntity } from './comment.entity';
import { PostEntity } from './post.entity';
import { UserEntity } from './user.entity';

export const entities = {
  users: UserEntity,
  posts: PostEntity,
  comments: CommentEntity,
};
export type EM = typeof entities;
```

Pass `EM` as the second generic to `RelayerService`, `RelayerController`, `RelayerHooks`, `@CrudController`, etc. This gives you:

- Autocomplete for relation fields (`author.fullName`, `comments`)
- Typed `where`, `select`, `orderBy` that include computed/derived fields from related entities
- Cross-entity access via `this.r.users`, `this.r.comments`

## Creating a service

```ts
import { Injectable } from '@nestjs/common';
import { InjectRelayer, RelayerService } from '@relayerjs/nestjs-crud';
import type { RelayerInstance } from '@relayerjs/nestjs-crud';

import { PostEntity, type EM } from '../entities';

@Injectable()
export class PostsService extends RelayerService<PostEntity, EM> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, PostEntity);
  }

  async findPublished() {
    return this.findMany({
      where: { published: true },
      select: { id: true, title: true },
    });
  }
}
```

## CRUD methods

All methods are fully typed based on `TEntity` and `TEntities`. Types like `Where`, `Select`, `OrderBy` include computed, derived, and relation fields.

### findMany

```ts
findMany<TSelect extends Select<TEntity, TEntities> | undefined>(
  options?: ManyOptions<TEntity, TEntities> & { select?: TSelect },
): Promise<SelectResult<Model<TEntity, TEntities>, TSelect>[]>
```

```ts
// Full entity
const posts = await this.findMany();

// With filtering and selection
const posts = await this.findMany({
  where: { published: true, author: { fullName: { contains: 'John' } } },
  select: { id: true, title: true, author: { fullName: true } },
  orderBy: { field: 'createdAt', order: 'desc' },
  limit: 10,
  offset: 0,
});
// Return type narrowed to: { id: number; title: string; author: { fullName: string } }[]
```

### findFirst

```ts
findFirst<TSelect extends Select<TEntity, TEntities> | undefined>(
  options?: FirstOptions<TEntity, TEntities> & { select?: TSelect },
): Promise<SelectResult<Model<TEntity, TEntities>, TSelect> | null>
```

```ts
const post = await this.findFirst({
  where: { id: 1 },
  select: { id: true, title: true },
});
// { id: number; title: string } | null
```

### count

```ts
count(options?: WhereOptions<TEntity, TEntities>): Promise<number>
```

```ts
const total = await this.count({ where: { published: true } });
```

### create

```ts
create(options: { data: Partial<TEntity> }): Promise<Model<TEntity, TEntities>>
```

```ts
const post = await this.create({
  data: { title: 'Hello', content: 'World', authorId: 1 },
});
```

### createMany

```ts
createMany(options: { data: Partial<TEntity>[] }): Promise<Model<TEntity, TEntities>[]>
```

```ts
const posts = await this.createMany({
  data: [
    { title: 'First', authorId: 1 },
    { title: 'Second', authorId: 2 },
  ],
});
```

### update

```ts
update(options: {
  where: Where<TEntity, TEntities>;
  data: Partial<TEntity>;
}): Promise<Model<TEntity, TEntities>>
```

```ts
const updated = await this.update({
  where: { id: 1 },
  data: { published: true },
});
```

### updateMany

```ts
updateMany(options: {
  where: Where<TEntity, TEntities>;
  data: Partial<TEntity>;
}): Promise<{ count: number }>
```

```ts
const { count } = await this.updateMany({
  where: { authorId: 5 },
  data: { published: false },
});
```

### delete

```ts
delete(options: { where: Where<TEntity, TEntities> }): Promise<Model<TEntity, TEntities>>
```

```ts
const deleted = await this.delete({ where: { id: 1 } });
```

### deleteMany

```ts
deleteMany(options: { where: Where<TEntity, TEntities> }): Promise<{ count: number }>
```

```ts
const { count } = await this.deleteMany({ where: { published: false } });
```

### aggregate

```ts
aggregate<const TOptions extends AggregateOptions<TEntity, TEntities>>(
  options: TOptions,
): Promise<AggregateResult<Model<TEntity, TEntities>, TOptions>[]>
```

```ts
const result = await this.aggregate({
  groupBy: ['author.fullName'],
  _count: true,
  _sum: { 'author.postsCount': true },
});
// result[0].author.fullName  -> string
// result[0]._count           -> number
// result[0]._sum.author.postsCount -> number | null
```

## Service defaults

Override protected methods to enforce business-level defaults. Applied automatically to every call -- from controllers, cron jobs, other services:

### getDefaultWhere

Combined with caller-provided `where` via `AND` (both conditions must match). Use for tenant isolation, RBAC, soft-delete filtering:

```ts
protected getDefaultWhere(
  upstream?: Where<PostEntity, EM>,
): Where<PostEntity, EM> | undefined {
  return { tenantId: this.getCurrentTenantId() };
}
```

For per-request scoping driven by the current user/tenant, use the typed context overload — see [Typed context](#typed-context) below.

### getDefaultOrderBy

Fallback -- used only when the caller doesn't provide their own `orderBy`:

```ts
protected getDefaultOrderBy(
  upstream?: OrderBy<PostEntity, EM> | OrderBy<PostEntity, EM>[],
): OrderBy<PostEntity, EM> | undefined {
  return { field: 'createdAt', order: 'desc' };
}
```

### getDefaultSelect

Fallback -- used only when the caller doesn't provide their own `select`:

```ts
protected getDefaultSelect(
  upstream?: Select<PostEntity, EM>,
): Select<PostEntity, EM> | undefined {
  return { id: true, title: true, published: true };
}
```

## Cross-entity access

`PostsService` is bound to `posts`. To query other entities directly (without relations on the current model), use the typed `this.r` client:

```ts
async findActiveCommenters() {
  return this.r.users.findMany({
    where: { comments: { some: { createdAt: { gte: lastWeek() } } } },
    select: { id: true, fullName: true, postsCount: true },
  });
}
```

For loading related data on the **current** entity, just use `select` with relations — one query, fully typed:

```ts
async getPostWithAuthor(id: number) {
  return this.findFirst({
    where: { id },
    select: { id: true, title: true, author: { id: true, fullName: true } },
  });
}
```

## Typed context

`RelayerService` accepts a third generic `TContext` that flows into every CRUD method's `options.context`, into `getDefaultWhere`, and into computed/derived field resolvers. Use it for row-level filtering driven by the current request — multi-tenancy, ownership checks, soft-deletes scoped to a user.

### Defining the context

```ts
// common/app-context.ts
export interface AppQueryContext {
  currentUserId: number;
  isAdmin: boolean;
}
```

### Typing the service

Pass `AppQueryContext` as the third generic and override `getDefaultWhere(upstream, ctx)` — the second parameter is now fully typed:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRelayer, RelayerService } from '@relayerjs/nestjs-crud';
import type { RelayerInstance, Where } from '@relayerjs/nestjs-crud';

import type { AppQueryContext } from '../../common/app-context';
import { PostEntity, type EM } from '../entities';

@Injectable()
export class PostsService extends RelayerService<PostEntity, EM, AppQueryContext> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, PostEntity);
  }

  // Non-admins only see published posts or their own drafts
  protected getDefaultWhere(
    upstream?: Where<PostEntity, EM>,
    ctx?: AppQueryContext,
  ): Where<PostEntity, EM> | undefined {
    if (!ctx || ctx.isAdmin) return upstream;

    const scoped: Where<PostEntity, EM> = {
      OR: [{ published: true }, { authorId: ctx.currentUserId }],
    };
    return upstream ? { AND: [upstream, scoped] } : scoped;
  }
}
```

The same `getDefaultWhere` is now applied on **every** read AND write — `findMany`, `findFirst`, `count`, `update`, `updateMany`, `delete`, `deleteMany`, `aggregate`. A non-admin trying to PATCH or DELETE someone else's post will get a no-op because the scoped where filters them out before the SQL runs.

### Passing context per call

The `context` option on every CRUD method is typed as `AppQueryContext`:

```ts
await postsService.findMany({
  where: { published: true },
  context: { currentUserId: 42, isAdmin: false },
});

await postsService.update({
  where: { id: 1 },
  data: { title: 'Updated' },
  context: { currentUserId: 42, isAdmin: false },
});
```

Wrong shapes are rejected at compile time:

```ts
await postsService.findMany({
  context: { wrong: 'shape' },
  // Type error: 'wrong' does not exist in type 'AppQueryContext'
});
```

### Auto-wiring from a controller

When a controller extends `RelayerController`, you typically don't pass `context` manually — the controller builds it from the request and forwards it to the service for every auto-generated route. See [CRUD Controller > Typed context](/nestjs/crud-controller/#typed-context) for the request → context → query-context flow.

## DI decorators

Three injection decorators for different levels of access:

```ts
// Full Relayer client with all entities
constructor(@InjectRelayer() r: RelayerInstance<EM>) {}

// Single entity repository (lower-level, no service defaults)
constructor(@InjectEntity(PostEntity) repo: EntityRepo<PostEntity, EM>) {}

// Auto-registered service without custom class
constructor(@InjectQueryService(PostEntity) service: RelayerService<PostEntity, EM>) {}
```

## Full example

See the [complete service example](https://github.com/awHamer/relayer/tree/main/examples/nestjs-crud/src/modules/posts/posts.service.ts) in the repository.
