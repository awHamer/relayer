---
title: Hooks & Context
description: Lifecycle hooks and typed request context for GraphQL resolvers.
---

## Lifecycle hooks

Hooks let you run logic before and after each operation. They are injectable NestJS services and receive fully typed arguments.

```ts
@Injectable()
export class PostHooks extends RelayerHooks<PostEntity, EM, AppContext> {
  private readonly logger = new Logger(PostHooks.name);

  afterFind(entities: PostEntity[], ctx: AppContext): void {
    this.logger.log(`Found ${entities.length} posts`);
  }

  beforeCreate(data: Partial<PostEntity>, ctx: AppContext) {
    return { ...data, slug: slugify(data.title!) };
  }

  afterCreate(entity: PostEntity, ctx: AppContext): void {
    this.logger.log(`Post created: ${entity.id}`);
  }
}
```

Register in the resolver config and module providers:

```ts
@GqlResolver(PostEntity, { hooks: PostHooks })
export class PostsResolver extends RelayerResolver<PostEntity, EM, AppContext> { ... }

@Module({
  providers: [PostsService, PostsResolver, PostHooks],
})
export class PostsModule {}
```

### Available hooks

| Hook              | Arguments            | Can modify result?     |
| ----------------- | -------------------- | ---------------------- |
| `beforeCreate`    | `(data, ctx)`        | Return modified data   |
| `afterCreate`     | `(entity, ctx)`      |                        |
| `beforeUpdate`    | `(data, where, ctx)` | Return modified data   |
| `afterUpdate`     | `(entity, ctx)`      |                        |
| `beforeDelete`    | `(where, ctx)`       |                        |
| `afterDelete`     | `(entity, ctx)`      |                        |
| `beforeFind`      | `(options, ctx)`     |                        |
| `afterFind`       | `(entities, ctx)`    | Return modified list   |
| `beforeFindOne`   | `(options, ctx)`     |                        |
| `afterFindOne`    | `(entity, ctx)`      | Return modified entity |
| `beforeCount`     | `(options, ctx)`     |                        |
| `beforeAggregate` | `(options, ctx)`     |                        |
| `afterAggregate`  | `(result, ctx)`      | Return modified result |

Hooks that "can modify result" can return a new value to override the original. Return `undefined` to keep the original.

The hooks API is shared with `@relayerjs/nestjs-crud`. See the [NestJS CRUD Hooks documentation](/nestjs/hooks/) for detailed examples.

## Typed context

Override `buildContext` and `buildQueryContext` in the resolver to extract request data and pass it through the entire pipeline:

```ts
interface AppContext {
  request: unknown;
  currentUser: { id: number; role: 'admin' | 'user' };
}

interface AppQueryContext {
  currentUserId: number;
  isAdmin: boolean;
}

@GqlResolver(PostEntity, { name: 'Post' })
export class PostsResolver extends RelayerResolver<PostEntity, EM, AppContext, AppQueryContext> {
  constructor(postsService: PostsService) {
    super(postsService);
  }

  protected buildContext(req: unknown): AppContext {
    const request = req as { headers?: Record<string, string> };
    return {
      request,
      currentUser: {
        id: Number(request?.headers?.['x-user-id'] ?? '0'),
        role: (request?.headers?.['x-user-role'] ?? 'user') as 'admin' | 'user',
      },
    };
  }

  protected buildQueryContext(ctx: AppContext): AppQueryContext {
    return {
      currentUserId: ctx.currentUser.id,
      isAdmin: ctx.currentUser.role === 'admin',
    };
  }
}
```

## Row-level scoping

The query context is forwarded to the service, where `getDefaultWhere` can use it for row-level security:

```ts
@Injectable()
export class PostsService extends RelayerService<PostEntity, EM, AppQueryContext> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, PostEntity);
  }

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

This scoping applies to **every** operation: reads, writes, counts, aggregates. A non-admin trying to update or delete someone else's post gets a no-op because the scoped where filters it out before the SQL runs.

The service API is shared with `@relayerjs/nestjs-crud`. See the [NestJS CRUD Query Service documentation](/nestjs/query-service/) for the full service reference.
