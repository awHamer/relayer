---
title: 'NestJS: Hooks'
description: Lifecycle hooks for side effects in CRUD operations.
---

## Overview

Hooks handle side effects around CRUD operations -- notifications, cache invalidation, audit logging, data enrichment. For business logic use service overrides, for response transformation use [Data Mapper](/nestjs/data-mapper).

## Creating hooks

Extend `RelayerHooks<TEntity, TEntities>`. All hook methods are optional, support sync and async, and receive fully typed arguments:

```ts
import { Injectable, Logger } from '@nestjs/common';
import {
  RelayerHooks,
  type AggregateOptions,
  type FirstOptions,
  type ManyOptions,
  type RequestContext,
  type Where,
  type WhereOptions,
} from '@relayerjs/nestjs-crud';

import { PostEntity, type EM } from '../entities';

@Injectable()
export class PostHooks extends RelayerHooks<PostEntity, EM> {
  private readonly logger = new Logger(PostHooks.name);

  constructor(
    private readonly events: EventEmitter2,
    private readonly cache: CacheManager,
  ) {
    super();
  }

  // ... implement any hooks you need
}
```

## Available hooks

### beforeCreate

Called before inserting a new record. Return modified data to change what gets saved.

```ts
async beforeCreate(
  data: Partial<PostEntity>,
  ctx: RequestContext,
): Promise<Partial<PostEntity> | void> {
  data.slug = slugify(data.title!);
  return data;
}
```

### afterCreate

Called after a record is inserted.

```ts
async afterCreate(entity: PostEntity, ctx: RequestContext): Promise<void> {
  this.logger.log(`Post created: ${entity.id} - ${entity.title}`);
  await this.events.emit('post.created', entity);
}
```

### beforeUpdate

Called before updating. Receives both the data to update and the where clause. Return modified data.

```ts
async beforeUpdate(
  data: Partial<PostEntity>,
  where: Where<PostEntity, EM>,
  ctx: RequestContext,
): Promise<Partial<PostEntity> | void> {
  data.updatedAt = new Date();
  return data;
}
```

### afterUpdate

Called after a record is updated.

```ts
async afterUpdate(entity: PostEntity, ctx: RequestContext): Promise<void> {
  await this.cache.del(`posts:${entity.id}`);
}
```

### beforeDelete

Called before deleting.

```ts
async beforeDelete(
  where: Where<PostEntity, EM>,
  ctx: RequestContext,
): Promise<void> {
  this.logger.log(`Deleting post with where: ${JSON.stringify(where)}`);
}
```

### afterDelete

Called after a record is deleted.

```ts
async afterDelete(entity: PostEntity, ctx: RequestContext): Promise<void> {
  await this.cache.del(`posts:${entity.id}`);
  await this.events.emit('post.deleted', entity);
}
```

### beforeFind

Called before `findMany` (list endpoint). Receives the full query options.

```ts
async beforeFind(
  options: ManyOptions<PostEntity, EM>,
  ctx: RequestContext,
): Promise<void> {
  this.logger.log(`Finding posts with options: ${JSON.stringify(options)}`);
}
```

### afterFind

Called after `findMany`. Return a modified list to filter or transform results.

```ts
async afterFind(
  entities: PostEntity[],
  ctx: RequestContext,
): Promise<PostEntity[] | void> {
  return entities.filter((e) => !e.isArchived);
}
```

### beforeFindOne

Called before `findFirst` (detail endpoint).

```ts
async beforeFindOne(
  options: FirstOptions<PostEntity, EM>,
  ctx: RequestContext,
): Promise<void> {
  this.logger.log(`Finding post: ${JSON.stringify(options)}`);
}
```

### afterFindOne

Called after `findFirst`. Return a modified entity.

```ts
async afterFindOne(
  entity: PostEntity,
  ctx: RequestContext,
): Promise<PostEntity | void> {
  // e.g. track view count
}
```

### beforeCount

Called before count queries.

```ts
async beforeCount(
  options: WhereOptions<PostEntity, EM>,
  ctx: RequestContext,
): Promise<void> {
  this.logger.log(`Counting posts`);
}
```

### beforeAggregate

Called before aggregate queries.

```ts
async beforeAggregate(
  options: AggregateOptions<PostEntity, EM>,
  ctx: RequestContext,
): Promise<void> {
  this.logger.log(`Aggregating: ${JSON.stringify(options)}`);
}
```

### afterAggregate

Called after aggregate. Return modified result.

```ts
async afterAggregate(
  result: unknown,
  ctx: RequestContext,
): Promise<unknown | void> {
  this.logger.log(`Aggregate result: ${JSON.stringify(result)}`);
}
```

## Summary table

| Hook              | Arguments                                     | Can modify?            |
| ----------------- | --------------------------------------------- | ---------------------- |
| `beforeCreate`    | `(data: Partial<TEntity>, ctx)`               | Return modified data   |
| `afterCreate`     | `(entity: TEntity, ctx)`                      |                        |
| `beforeUpdate`    | `(data: Partial<TEntity>, where: Where, ctx)` | Return modified data   |
| `afterUpdate`     | `(entity: TEntity, ctx)`                      |                        |
| `beforeDelete`    | `(where: Where, ctx)`                         |                        |
| `afterDelete`     | `(entity: TEntity, ctx)`                      |                        |
| `beforeFind`      | `(options: ManyOptions, ctx)`                 |                        |
| `afterFind`       | `(entities: TEntity[], ctx)`                  | Return modified list   |
| `beforeFindOne`   | `(options: FirstOptions, ctx)`                |                        |
| `afterFindOne`    | `(entity: TEntity, ctx)`                      | Return modified entity |
| `beforeCount`     | `(options: WhereOptions, ctx)`                |                        |
| `beforeAggregate` | `(options: AggregateOptions, ctx)`            |                        |
| `afterAggregate`  | `(result: unknown, ctx)`                      | Return modified result |
| `beforeRelation`  | `(operation, relationName, ids, ctx)`         | Return modified ids    |
| `afterRelation`   | `(operation, relationName, ids, ctx)`         |                        |

All option types (`Where`, `ManyOptions`, `FirstOptions`, `WhereOptions`, `AggregateOptions`) are generic over `<TEntity, TEntities>`. Relation hooks use `RelationOperation`, `RelationKeys<TEntity, TEntities>`, and `RelationId[]`.

## Registration

Register in module providers and reference in `@CrudController`:

```ts
// posts.controller.ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  hooks: PostHooks,
})
export class PostsController extends RelayerController<PostEntity, EM> { ... }

// posts.module.ts
@Module({
  providers: [PostsService, PostHooks],
})
export class PostsModule {}
```

Hooks are resolved via NestJS DI -- constructor injection works.

## Relation hooks

`beforeRelation` and `afterRelation` fire for connect, disconnect, and set operations -- both from dedicated endpoints and inline PATCH:

```ts
import {
  RelayerHooks,
  type RelationId,
  type RelationKeys,
  type RelationOperation,
  type RequestContext,
} from '@relayerjs/nestjs-crud';

@Injectable()
export class PostHooks extends RelayerHooks<PostEntity, EM> {
  beforeRelation(
    operation: RelationOperation, // 'connect' | 'disconnect' | 'set'
    relationName: RelationKeys<PostEntity, EM>, // e.g. 'postCategories'
    ids: RelationId[], // [1, 2] or [{ _id: 1, isPrimary: true }]
    ctx: RequestContext,
  ) {
    this.logger.log(`${operation} on ${relationName}: [${ids}]`);
    // Return modified ids to override input, or void to pass through
  }

  afterRelation(
    operation: RelationOperation,
    relationName: RelationKeys<PostEntity, EM>,
    ids: RelationId[],
    ctx: RequestContext,
  ) {
    // Side effects after the relation was updated
  }
}
```

See [Relations](/nestjs/relations/) for the full guide.
