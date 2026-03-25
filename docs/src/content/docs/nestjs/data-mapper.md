---
title: 'NestJS: Data Mapper'
description: Transform entity data for API responses with DtoMapper.
---

## Overview

DtoMapper transforms between entity (internal) and API response (external). It only affects the controller/API layer -- services always work with entity types.

## Basic usage

```ts
import { Injectable } from '@nestjs/common';
import { DtoMapper } from '@relayerjs/nestjs-crud';

interface PostListItem {
  id: number;
  title: string;
  published: boolean;
}

interface PostDetail {
  id: number;
  title: string;
  content: string | null;
  published: boolean;
  createdAt: Date;
}

@Injectable()
export class PostDtoMapper extends DtoMapper<PostEntity, PostListItem, PostDetail> {
  toListItem(entity: PostEntity): PostListItem {
    return {
      id: entity.id,
      title: entity.title,
      published: entity.published,
    };
  }

  toSingleItem(entity: PostEntity): PostDetail {
    return {
      id: entity.id,
      title: entity.title,
      content: entity.content,
      published: entity.published,
      createdAt: entity.createdAt,
    };
  }
}
```

Four generics with cascading defaults:

| Generic       | Default            | Description                                          |
| ------------- | ------------------ | ---------------------------------------------------- |
| `TEntity`     |                    | Entity type                                          |
| `TListItem`   | `TEntity`          | Return type of `toListItem()`                        |
| `TSingleItem` | `TListItem`        | Return type of `toSingleItem()`                      |
| `TInput`      | `Partial<TEntity>` | Input type for `toCreateInput()` / `toUpdateInput()` |

```ts
DtoMapper<TEntity>; // no transformation
DtoMapper<TEntity, TResponse>; // same format for list and detail
DtoMapper<TEntity, TListItem, TSingleItem>; // different formats
DtoMapper<TEntity, TListItem, TSingleItem, TInput>; // custom input type
```

## Input transformation

Transform incoming create/update data. Input is typed as `TInput` (defaults to `Partial<TEntity>`), return is `Partial<TEntity>`:

```ts
@Injectable()
export class PostDtoMapper extends DtoMapper<PostEntity, PostListItem, PostDetail> {
  // ... toListItem, toSingleItem

  toCreateInput(input: Partial<PostEntity>, ctx: RequestContext) {
    return {
      ...input,
      authorId: (ctx.user as { id: number })?.id ?? 1,
    };
  }

  toUpdateInput(input: Partial<PostEntity>, ctx: RequestContext) {
    return {
      ...input,
      updatedAt: new Date(),
    };
  }
}
```

## Async support

DtoMapper methods can be async:

```ts
@Injectable()
export class PostDtoMapper extends DtoMapper<PostEntity, PostListItem, PostDetail> {
  constructor(private readonly storage: StorageService) {
    super();
  }

  async toSingleItem(entity: PostEntity): Promise<PostDetail> {
    const imageUrl = await this.storage.getSignedUrl(entity.imageKey);
    return { ...entity, imageUrl };
  }
}
```

## Registration

Register in module providers and reference in `@CrudController`:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  dtoMapper: PostDtoMapper,
})
export class PostsController extends RelayerController<PostEntity, EM> { ... }

@Module({
  providers: [PostsService, PostDtoMapper],
})
```

DtoMapper is resolved via NestJS DI -- constructor injection works.

## Without DtoMapper

When no `dtoMapper` is configured, entity data is returned as-is from the service.

## What goes where

- **Service** -- business logic (slug generation, tenant scoping, custom queries)
- **DtoMapper** -- transform response shape, add/remove fields for API
- **Hooks** -- side effects (notifications, cache, audit logging)
