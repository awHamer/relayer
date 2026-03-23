---
title: 'NestJS: Hooks'
description: Lifecycle hooks for side effects in CRUD operations.
---

## Overview

Hooks handle side effects that don't change data shape -- notifications, cache invalidation, audit logging. For business logic use service overrides, for response transformation use DtoMapper.

## Creating hooks

```ts
import { Injectable, Logger } from '@nestjs/common';
import { RelayerHooks } from '@relayerjs/nestjs-crud';

@Injectable()
export class PostHooks extends RelayerHooks<PostEntity> {
  private readonly logger = new Logger(PostHooks.name);

  constructor(
    private readonly events: EventEmitter2,
    private readonly cache: CacheManager,
  ) {
    super();
  }

  async afterCreate(entity: PostEntity): Promise<void> {
    this.logger.log(`Post created: ${entity.id}`);
    await this.events.emit('post.created', entity);
  }

  async afterUpdate(entity: PostEntity): Promise<void> {
    await this.cache.del(`posts:${entity.id}`);
  }

  async afterDelete(entity: PostEntity): Promise<void> {
    await this.cache.del(`posts:${entity.id}`);
    await this.events.emit('post.deleted', entity);
  }
}
```

## Available hooks

All methods are optional and async:

| Hook           | Parameters           | Called                         |
| -------------- | -------------------- | ------------------------------ |
| `beforeCreate` | `(data, ctx)`        | Before insert, can modify data |
| `afterCreate`  | `(entity, ctx)`      | After insert                   |
| `beforeUpdate` | `(data, where, ctx)` | Before update, can modify data |
| `afterUpdate`  | `(entity, ctx)`      | After update                   |
| `beforeDelete` | `(where, ctx)`       | Before delete                  |
| `afterDelete`  | `(entity, ctx)`      | After delete                   |
| `beforeFind`   | `(options, ctx)`     | Before list/findMany           |

## Modifying data in before hooks

`beforeCreate` and `beforeUpdate` can return modified data:

```ts
async beforeCreate(data: Record<string, unknown>, ctx: RequestContext) {
  data.slug = slugify(data.title as string);
  return data;  // return modified data
}
```

## Registration

Register in module providers and reference in `@CrudController`:

```ts
@CrudController({
  model: PostEntity,
  hooks: PostHooks,
})

@Module({
  providers: [PostsService, PostHooks],
})
```

Hooks are resolved via NestJS DI -- constructor injection works.
