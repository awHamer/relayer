---
title: 'NestJS: Configuration'
description: Configure defaults, restrictions, pagination, and nested resources.
---

## Default selection

Load specific fields and relations by default -- no query params needed:

```ts
@CrudController({
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
      },
    },
  },
})
```

`GET /posts` now returns posts with comments (max 5 per post) and comment authors -- without the client specifying `?select=`.

Works for `findById` too:

```ts
routes: {
  findById: {
    defaults: {
      select: { id: true, title: true, content: true, comments: { id: true } },
    },
  },
}
```

## Default sorting

```ts
defaults: {
  orderBy: { field: 'createdAt', order: 'desc' },
}
```

Client can override with `?orderBy=...` or `?sort=-title`.

## Default filters

Always applied, merged with client's where:

```ts
defaults: {
  where: { status: 'published' },
}
```

`GET /posts?where={"authorId":1}` becomes `{ status: 'published', authorId: 1 }`.

## Restricting what clients can query

### Block fields from select

```ts
allow: {
  select: { password: false, secretNotes: false },
}
```

### Limit relation rows

```ts
allow: {
  select: { comments: { $limit: 10 } },  // server enforces max 10
}
```

If client sends `?select={"comments":{"$limit":100}}`, server caps to 10.

### Restrict where operators

```ts
allow: {
  where: {
    title: { operators: ['contains', 'ilike', 'startsWith'] },
    published: true,      // all operators allowed
    authorId: true,
  },
}
```

### Restrict sortable fields

```ts
allow: {
  orderBy: ['title', 'createdAt'],
}
```

## Pagination mode

### Offset (default)

```ts
routes: {
  list: {
    defaultLimit: 20,
    maxLimit: 100,
  },
}
```

### Cursor

```ts
routes: {
  list: {
    pagination: 'cursor_UNSTABLE',
    defaults: { orderBy: { field: 'createdAt', order: 'desc' } },
    defaultLimit: 20,
  },
}
```

See [Search & Filtering](/nestjs/search-and-filtering) for response format details.

See [Known Limitations](/nestjs/limitations#cursor-pagination) for details on date precision and workarounds.

## Nested resources

Mount a controller under a parent resource:

```ts
@CrudController({
  model: CommentEntity,
  path: 'posts/:postId/comments',
  params: {
    postId: { field: 'postId', type: 'number' },
  },
})
export class CommentsController extends RelayerController<CommentEntity> {
  constructor(@InjectQueryService(CommentEntity) service: RelayerService<CommentEntity>) {
    super(service);
  }
}
```

`GET /posts/5/comments` auto-filters by `{ postId: 5 }`.
`POST /posts/5/comments` auto-injects `postId: 5` into the body.

## ID configuration

Auto-detected from Drizzle table primary key. Override if needed:

```ts
@CrudController({
  model: UserEntity,
  id: { field: 'userId', type: 'uuid' },
})
```

Types: `'number'` (default), `'string'`, `'uuid'`.

## Base URL

Set globally for `nextPageUrl` in responses:

```ts
RelayerModule.forRoot({
  db, schema, entities: [...],
  baseUrl: 'https://api.example.com',
  // or dynamic:
  baseUrl: () => `http://localhost:${process.env.PORT}`,
})
```

## Full example

```ts
@CrudController({
  model: PostEntity,
  routes: {
    list: {
      pagination: 'cursor_UNSTABLE',
      defaults: {
        select: { id: true, title: true, published: true },
        orderBy: { field: 'createdAt', order: 'desc' },
      },
      allow: {
        select: { password: false, comments: { $limit: 10 } },
        where: { title: { operators: ['contains', 'ilike'] }, published: true },
        orderBy: ['title', 'createdAt'],
      },
      maxLimit: 50,
      defaultLimit: 20,
      search: (q) => ({
        OR: [{ title: { ilike: `%${q}%` } }, { content: { ilike: `%${q}%` } }],
      }),
    },
    findById: {
      defaults: {
        select: { id: true, title: true, content: true, comments: { id: true, content: true } },
      },
    },
    create: { schema: createPostSchema },
    update: { schema: updatePostSchema },
    delete: true,
    count: true,
  },
  decorators: [
    UseGuards(AuthGuard),
    { apply: [Roles('admin')], for: ['create', 'update', 'delete'] },
  ],
  dtoMapper: PostDtoMapper,
  hooks: PostHooks,
})
```
