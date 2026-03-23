---
title: 'NestJS: DTO Mapper'
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

  toResponse(entity: PostEntity): PostDetail {
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

Three generics with cascading defaults:

```ts
DtoMapper<TEntity>; // no transformation
DtoMapper<TEntity, TResponse>; // same format for list and detail
DtoMapper<TEntity, TListItem, TDetailItem>; // different formats
```

## Input transformation

Transform incoming create/update data:

```ts
@Injectable()
export class PostDtoMapper extends DtoMapper<PostEntity, PostListItem, PostDetail> {
  // ... toListItem, toResponse

  toCreateInput(input: Record<string, unknown>, ctx: RequestContext) {
    return {
      ...input,
      authorId: (ctx.user as { id: number })?.id ?? 1,
    };
  }

  toUpdateInput(input: Record<string, unknown>, ctx: RequestContext) {
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

  async toResponse(entity: PostEntity): Promise<PostDetail> {
    const imageUrl = await this.storage.getSignedUrl(entity.imageKey);
    return { ...entity, imageUrl };
  }
}
```

## Registration

Register in module providers and reference in `@CrudController`:

```ts
@CrudController({
  model: PostEntity,
  dtoMapper: PostDtoMapper,
})
export class PostsController extends RelayerController<PostEntity, PostDtoMapper> { ... }

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
