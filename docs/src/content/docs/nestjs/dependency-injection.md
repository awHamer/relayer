---
title: 'NestJS: Dependency Injection'
description: Inject entity clients and services with NestJS DI.
---

## @InjectEntity

Inject the raw entity client (Relayer's query interface):

```ts
import { InjectEntity, type EntityClient } from '@relayerjs/nestjs-crud';

@Injectable()
export class PostsService extends RelayerService<PostEntity> {
  constructor(@InjectEntity(PostEntity) repo: EntityClient) {
    super(repo);
  }
}
```

## @InjectQueryService

Inject a default `RelayerService` without creating a custom service class:

```ts
import { InjectQueryService, type RelayerService } from '@relayerjs/nestjs-crud';

@CrudController({ model: CommentEntity })
export class CommentsController extends RelayerController<CommentEntity> {
  constructor(@InjectQueryService(CommentEntity) service: RelayerService<CommentEntity>) {
    super(service);
  }
}
```

`RelayerModule.forFeature([CommentEntity])` automatically registers both the entity client and a default `RelayerService` for each entity.

## Cross-entity access

Inject entity clients from other entities:

```ts
@Injectable()
export class OrdersService extends RelayerService<OrderEntity> {
  constructor(
    @InjectEntity(OrderEntity) repo: EntityClient,
    @InjectEntity(PostEntity) private readonly posts: EntityClient,
  ) {
    super(repo);
  }

  async createWithNotification(data: Record<string, unknown>) {
    const order = await this.create(data);
    const post = await this.posts.findFirst({ where: { id: order.postId } });
    return { order, post };
  }
}
```

## Service defaults

Override default query behavior in custom services:

```ts
@Injectable()
export class PostsService extends RelayerService<PostEntity> {
  constructor(@InjectEntity(PostEntity) repo: EntityClient) {
    super(repo);
  }

  // Business-level defaults, applied everywhere (controller, cron, other services)
  protected getDefaultWhere(upstream?: Record<string, unknown>) {
    return { ...upstream, tenantId: this.getCurrentTenantId() };
  }

  protected getDefaultOrderBy(upstream?: unknown) {
    return upstream ?? { field: 'createdAt', order: 'desc' };
  }
}
```

Controller `defaults` (from config) are passed as `upstream`. Service can extend or override them.

Priority: `user query params > service getDefault*() > controller defaults`

## forRoot vs forFeature

- `forRoot` -- registers the Relayer client globally, call once in `AppModule`
- `forFeature([Entity])` -- registers entity client + default service providers per entity, call in each feature module
