---
title: 'NestJS: CRUD Controller'
description: Configure routes, defaults, access control, pagination, decorators, and handler overrides.
---

## Initialize

One decorator turns a controller into a full CRUD API:

```ts
import { CrudController, RelayerController } from '@relayerjs/nestjs-crud';

import { PostEntity, type EM } from '../entities';
import { PostsService } from './posts.service';

@CrudController<PostEntity, EM>({
  model: PostEntity,
})
export class PostsController extends RelayerController<PostEntity, EM> {
  constructor(postsService: PostsService) {
    super(postsService);
  }
}
```

Pass `TEntities` (your [entity map](/nestjs/query-service#entity-map)) as the second generic for full type-safe config -- relation-aware field autocomplete in `defaults`, `allow`, and `search`.

## Routes

Enable or disable individual routes:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    list: true,        // GET /posts
    findById: true,    // GET /posts/:id
    create: true,      // POST /posts
    update: true,      // PATCH /posts/:id
    delete: true,      // DELETE /posts/:id
    count: true,       // GET /posts/count
    aggregate: true,   // GET /posts/aggregate
    relations: {
      postCategories: true,  // POST/DELETE/PUT /posts/:id/relations/postCategories
    },
  },
})
```

Each route accepts `true` (enable with defaults), `false` (disable), or a config object. CRUD routes are enabled by default; relation routes must be enabled explicitly.

See [Relations](/nestjs/relations/) for the full relation endpoints guide.

## Pagination

### Offset (default)

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    list: {
      defaultLimit: 20,
      maxLimit: 100,
    },
  },
})
```

### Cursor

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    list: {
      pagination: 'cursor',
      defaults: { orderBy: { field: 'createdAt', order: 'desc' } },
      defaultLimit: 20,
    },
  },
})
```

See [Search & Filtering](/nestjs/search-and-filtering) for client-side usage and response formats.

## Default selection

Set defaults for `select`, `orderBy`, and `where`. Used when the client doesn't provide their own:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    list: {
      defaults: {
        select: {
          id: true,
          title: true,
          published: true,
          comments: { $limit: 5, id: true, content: true, author: { fullName: true } },
        },
        orderBy: { field: 'createdAt', order: 'desc' },
        where: { status: 'published' },
      },
    },
    findById: {
      defaults: {
        select: { id: true, title: true, content: true, comments: { id: true } },
      },
    },
  },
})
```

- `defaults.select` -- used when client doesn't send `?select=`
- `defaults.orderBy` -- used when client doesn't send `?orderBy=` or `?sort=`
- `defaults.where` -- always merged with client's `where` (shallow merge, client values override)

## Allow rules

Control what clients can query. Place `allow` inside the route config alongside `defaults`:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    list: {
      defaults: {
        orderBy: { field: 'createdAt', order: 'desc' },
      },
      allow: {
        // Block fields from select or limit relation rows
        select: { password: false, comments: { $limit: 10 } },

        // Restrict which fields can be filtered and which operators are allowed
        where: {
          title: { operators: ['contains', 'ilike', 'startsWith'] },
          published: true,      // all operators allowed
          authorId: true,
        },

        // Restrict which fields can be used for sorting
        orderBy: ['title', 'createdAt'],
      },
      maxLimit: 100,
      defaultLimit: 20,
    },
  },
})
```

If client sends `?select={"comments":{"$limit":100}}`, server caps to 10.

## Search

Define a search callback that maps a search string to a `where` clause. Place it in the list route config:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    list: {
      search: (q) => ({
        OR: [
          { title: { ilike: `%${q}%` } },
          { content: { ilike: `%${q}%` } },
        ],
      }),
    },
  },
})
```

Clients use `?search=hello`. The search where is AND-combined with any `?where=` the client provides. See [Search & Filtering](/nestjs/search-and-filtering) for client-side usage.

## Decorator targeting

Apply NestJS decorators to all or specific routes:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  decorators: [
    // Bare decorator -> all routes
    UseGuards(AuthGuard),

    // Targeted -> specific routes only
    { apply: [Roles('admin')], for: ['create', 'update', 'delete'] },
    { apply: [CacheInterceptor], for: ['list', 'findById'] },
  ],
})
```

Route names: `'list'`, `'findById'`, `'create'`, `'update'`, `'delete'`, `'count'`, `'aggregate'`, `'relationConnect'`, `'relationDisconnect'`, `'relationSet'`.

## DtoMapper and Hooks

Register via config properties. Both are resolved via NestJS DI:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  dtoMapper: PostDtoMapper,
  hooks: PostHooks,
})
```

See [Data Mapper](/nestjs/data-mapper) and [Hooks](/nestjs/hooks) for full API reference. Relation-specific hooks (`beforeRelation`, `afterRelation`) are covered in [Relations](/nestjs/relations/#hooks).

## Swagger

All auto-generated routes include OpenAPI metadata -- summaries, query parameters with examples, request body schemas, response codes. Install `@nestjs/swagger` and it just works. Customize per-route via `swagger` config:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  swagger: {
    tag: 'Blog Posts',
    list: { summary: 'Search blog posts' },
    create: { description: 'Publish a new post with tags' },
  },
})
```

Set `swagger: false` to disable. See [Swagger / OpenAPI](/nestjs/swagger/) for the full guide.

## Overriding handlers

Override any handler method directly in your controller class. Other handlers remain auto-generated:

```ts
@CrudController<PostEntity, EM>({ model: PostEntity })
export class PostsController extends RelayerController<PostEntity, EM> {
  constructor(private readonly postsService: PostsService) {
    super(postsService);
  }

  // Override list
  protected async handleList(request: { query: Record<string, string> }) {
    const data = await this.postsService.findPublished();
    return { data, meta: { total: data.length, limit: 100, offset: 0 } };
  }

  // Override find by ID
  protected async handleFindById(id: string, request: unknown) {
    const post = await this.postsService.findFirst({
      where: { id: parseInt(id, 10) },
      select: { id: true, title: true, author: { fullName: true } },
    });
    return { data: post };
  }

  // Override create
  protected async handleCreate(body: Record<string, unknown>, request: unknown) {
    const post = await this.postsService.create({ data: body as Partial<PostEntity> });
    return { data: post };
  }

  // Override update
  protected async handleUpdate(id: string, body: Record<string, unknown>, request: unknown) {
    const updated = await this.postsService.update({
      where: { id: parseInt(id, 10) },
      data: body as Partial<PostEntity>,
    });
    return { data: updated };
  }

  // Override delete
  protected async handleDelete(id: string, request: unknown) {
    const deleted = await this.postsService.delete({ where: { id: parseInt(id, 10) } });
    return { data: deleted };
  }

  // Override count
  protected async handleCount(request: { query: Record<string, string> }) {
    const count = await this.postsService.count();
    return { data: { count } };
  }

  // Override aggregate
  protected async handleAggregate(request: { query: Record<string, string> }) {
    const result = await this.postsService.aggregate({ _count: true });
    return { data: result };
  }

  // Override relation connect
  protected async handleRelationConnect(
    id: string,
    relationName: RelationKeys<PostEntity, EM>,
    body: Record<string, unknown>,
    request: unknown,
  ) {
    console.log(`Connecting ${relationName} to post ${id}`);
    return super.handleRelationConnect(id, relationName, body, request);
  }
}
```

## Custom routes

Add non-CRUD routes alongside auto-generated ones:

```ts
@CrudController<PostEntity, EM>({ model: PostEntity })
export class PostsController extends RelayerController<PostEntity, EM> {
  constructor(private readonly postsService: PostsService) {
    super(postsService);
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard)
  async publish(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.postsService.publish(id) };
  }

  @Get('published')
  async published() {
    return { data: await this.postsService.findPublished() };
  }
}
```

## Nested resources

Mount a controller under a parent resource path. The `params` option maps URL parameters to entity fields -- they are automatically applied as `where` filters on list/findById/count and injected into the body on create:

```ts
@CrudController<CommentEntity, EM>({
  model: CommentEntity,

  // URL path with :postId parameter
  path: 'posts/:postId/comments',

  // Map :postId from URL to the 'postId' field on CommentEntity
  params: {
    postId: { field: 'postId', type: 'number' },
  },
})
export class CommentsController extends RelayerController<CommentEntity, EM> {
  constructor(@InjectQueryService(CommentEntity) service: RelayerService<CommentEntity, EM>) {
    super(service);
  }
}
```

What this does:

- `GET /posts/5/comments` -> `service.findMany({ where: { postId: 5 } })`
- `GET /posts/5/comments/3` -> `service.findFirst({ where: { postId: 5, id: 3 } })`
- `POST /posts/5/comments` with `{ content: "hello" }` -> `service.create({ data: { content: "hello", postId: 5 } })`
- `GET /posts/5/comments/count` -> `service.count({ where: { postId: 5 } })`

## ID configuration

By default, the ID field is auto-detected from the Drizzle table primary key. Override if your table uses a non-standard name or UUID:

```ts
@CrudController<UserEntity, EM>({
  model: UserEntity,
  id: { field: 'userId', type: 'uuid' },
})
```

Types: `'number'` (default), `'string'`, `'uuid'`. This affects how the `:id` path parameter is parsed.

## Typed context

`RelayerController` accepts two extra generics — `TCtx` (the request-scoped context that hooks receive) and `TQueryCtx` (the slim context the service consumes). Override `buildContext` to extract data from the request, and `buildQueryContext` to derive the query-scope context from it. Both are auto-wired into every handler.

The typed flow:

```
HTTP request
  -> buildContext(request)        -> AppContext         (passed to hooks)
  -> buildQueryContext(appCtx)    -> AppQueryContext    (passed to service.* { context })
       -> getDefaultWhere(_, ctx) is called with AppQueryContext for row-level scoping
```

### Defining the contexts

Two interfaces — one for hooks (request-rich) and one for the service (slim, SQL-bound):

```ts
// common/app-context.ts
import type { RequestContext } from '@relayerjs/nestjs-crud';

export interface AppUser {
  id: number;
  role: 'admin' | 'user';
}

// Full request-scoped context. Used by NestJS lifecycle hooks.
export interface AppContext extends RequestContext {
  currentUser: AppUser;
}

// Slimmer query context. Flows into service.findMany / computed / derived resolvers.
export interface AppQueryContext {
  currentUserId: number;
  isAdmin: boolean;
}
```

### Typing the controller

Pass `AppContext` and `AppQueryContext` as the 4th and 5th generics, then override the two builders:

```ts
import { CrudController, RelayerController } from '@relayerjs/nestjs-crud';

import type { AppContext, AppQueryContext, AppUser } from '../../common/app-context';
import { PostEntity, type EM } from '../entities';
import { PostDtoMapper } from './posts.dto-mapper';
import { PostHooks } from './posts.hooks';
import { PostsService } from './posts.service';

@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: { list: true, create: true, update: true, delete: true },
  hooks: PostHooks,
  dtoMapper: PostDtoMapper,
})
export class PostsController extends RelayerController<
  PostEntity,
  EM,
  PostDtoMapper,
  AppContext,
  AppQueryContext
> {
  constructor(private readonly postsService: PostsService) {
    super(postsService);
  }

  protected buildContext(request: unknown): AppContext {
    const user = (request as { user?: AppUser }).user ?? { id: 0, role: 'user' };
    return { request, currentUser: user };
  }

  protected buildQueryContext(ctx: AppContext): AppQueryContext {
    return {
      currentUserId: ctx.currentUser.id,
      isAdmin: ctx.currentUser.role === 'admin',
    };
  }
}
```

### How it propagates

For every auto-generated route the controller automatically:

1. Calls `buildContext(request)` to produce `AppContext`
2. Passes `AppContext` to all matching lifecycle hooks (`beforeFind`, `afterCreate`, `beforeRelation`, etc.)
3. Calls `buildQueryContext(ctx)` to produce `AppQueryContext`
4. Forwards `AppQueryContext` to the service via `{ context: queryCtx }` on every read AND write call

The service then uses it inside `getDefaultWhere(upstream, ctx)` for row-level filtering — see [Query Service > Typed context](/nestjs/query-service/#typed-context).

### Why two contexts

`AppContext` is rich and request-bound (carries the raw request, headers, full user object) — perfect for hooks doing logging, metrics, or cache invalidation. `AppQueryContext` is slim and serializable — only the fields the SQL layer actually needs. Keeping them separate makes hook code expressive and SQL-resolver code minimal.

If you don't need the split, set both generics to the same interface and return `ctx` from `buildQueryContext`.

### Hook types

Update `PostHooks` to take advantage of the typed `AppContext`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { RelayerHooks } from '@relayerjs/nestjs-crud';

import type { AppContext } from '../../common/app-context';
import { PostEntity, type EM } from '../entities';

@Injectable()
export class PostHooks extends RelayerHooks<PostEntity, EM, AppContext> {
  private readonly logger = new Logger(PostHooks.name);

  async afterCreate(entity: PostEntity, ctx: AppContext): Promise<void> {
    this.logger.log(`Post ${entity.id} created by user ${ctx.currentUser.id}`);
  }
}
```

`ctx.currentUser` is fully typed — no casts.

## Full example

See the [complete controller example](https://github.com/awHamer/relayer/tree/main/examples/nestjs-crud/src/modules/posts/posts.controller.ts) in the repository.
