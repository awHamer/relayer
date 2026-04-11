# @relayerjs/nestjs-graphql

Full-featured GraphQL CRUD for NestJS on top of [Relayer](https://github.com/nicepkg/relayer), an ORM-agnostic database layer. Define a Drizzle schema, add an entity class, drop it into a resolver and get a complete code-first GraphQL API with filtering, dual pagination, aggregation, and lifecycle hooks.

---

## Features

🧱 **Built on Relayer's core** - ORM-agnostic by design. Currently supports Drizzle ORM only, as we are in early development.

⚡ **Full-featured GraphQL CRUD** - One `@GqlResolver` decorator generates queries, mutations, and all GraphQL types. Zero boilerplate.

📄 **Three pagination modes** - offset, flat cursor, and Relay-style cursor with edges. Pick whichever fits your use case.

🔥 **Rich filtering** - AND/OR/NOT combinators, relation filters (some/every/none), per-type operators, case-insensitive mode.

📊 **Aggregation** - groupBy, count, sum, avg, min, max with full type safety.

🎯 **Selection optimization** - Reads the GraphQL info tree and fetches only the requested fields from the database.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Resolver Configuration](#resolver-configuration)
- [Pagination](#pagination)
- [Filtering](#filtering)
- [Ordering](#ordering)
- [Aggregation](#aggregation)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Typed Context](#typed-context)
- [Field Selection](#field-selection)
- [Module Options](#module-options)

## Installation

```bash
npm install @relayerjs/nestjs-graphql @relayerjs/core @relayerjs/drizzle @relayerjs/nestjs-common
```

Assumes a working NestJS GraphQL setup (`@nestjs/graphql`, `@nestjs/apollo`, `graphql`, `graphql-scalars`, and their peer dependencies).

## Quick Start

### 1. Define entities

```ts
// entities/post.entity.ts
import { createRelayerEntity } from '@relayerjs/drizzle';

import * as schema from '../schema';

export class PostEntity extends createRelayerEntity(schema, 'posts') {}
```

```ts
// entities/user.entity.ts
const UserBase = createRelayerEntity(schema, 'users');

export class UserEntity extends UserBase {
  @UserBase.computed({
    resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  fullName!: string;
}
```

### 2. Create an entity map

The entity map ties your entity classes together and enables cross-entity type inference:

```ts
// entities/entity-map.ts
export const entities = { users: UserEntity, posts: PostEntity };
export type EM = typeof entities;
```

### 3. Register the module

```ts
@Module({
  imports: [
    RelayerGraphqlModule.forRoot({
      db,
      schema,
      entities: [UserEntity, PostEntity],
      defaultRelationLimit: 50,
    }),
    UsersModule,
    PostsModule,
  ],
})
export class AppModule {}
```

`RelayerGraphqlModule` auto-configures Apollo Server with code-first schema generation. No schema files needed.

### 4. Create a service

```ts
@Injectable()
export class UsersService extends RelayerService<UserEntity, EM> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, UserEntity);
  }
}
```

### 5. Create a resolver

```ts
@GqlResolver(UserEntity, { name: 'User' })
export class UsersResolver extends RelayerResolver<UserEntity, EM> {
  constructor(usersService: UsersService) {
    super(usersService);
  }
}
```

That's it. One decorator, full GraphQL CRUD:

| Type     | Name                       | Description              |
| -------- | -------------------------- | ------------------------ |
| Query    | `users`                    | Cursor-paginated list    |
| Query    | `user(id: ID!)`            | Find by ID               |
| Query    | `usersCount(where: ...)`   | Count matching records   |
| Query    | `usersAggregate(...)`      | Aggregation with groupBy |
| Mutation | `createUser(data: ...)`    | Create one               |
| Mutation | `updateUser(id: ID!, ...)` | Update one               |
| Mutation | `deleteUser(id: ID!)`      | Delete one               |

All GraphQL types are generated automatically: `User`, `UserWhereInput`, `UserOrderByInput`, `CreateUserInput`, `UpdateUserInput`, `UserCursorResult`, `PageInfo`, `UserAggregate`, plus scalar filter inputs (`StringFilter`, `IntFilter`, etc.).

> Full working example with entities, services, resolvers, hooks, and typed context is available in [examples/nestjs-graphql](../../examples/nestjs-graphql).

## Architecture

Every GraphQL operation flows through a layered pipeline. Each layer is optional and independently overridable:

```mermaid
flowchart TD
    A["GraphQL Request"] --> B["@GqlResolver\nType generation, method registration"]
    B --> C["RelayerResolver\nContext building, hook resolution"]
    C --> D["Handlers\nhandleList / handleFindById / handleCreateOne / ..."]
    D --> E["Hooks\nbeforeCreate / afterFind / ..."]
    D --> F["Info -> Select\nGraphQL selection tree -> minimal DB select"]
    E --> G["RelayerService\ngetDefaultWhere merging, query execution"]
    F --> G
    G --> H["GraphQL Response"]
```

### What each piece does

**@GqlResolver** reads entity metadata at decoration time and generates all GraphQL types (ObjectType, inputs, connections, filters) plus resolver methods. Everything is ready before the app starts.

**RelayerResolver** is the runtime base class. It resolves hooks from the DI container and builds typed context from the incoming request.

**Handlers** execute the actual operations: list, findById, create, update, delete, count, aggregate. Each handler integrates hooks and traverses the GraphQL `info` tree to build a minimal select clause.

**RelayerService** is the data layer. It wraps a Relayer repository, applies business-level defaults (`getDefaultWhere`, `getDefaultOrderBy`), and executes queries via Drizzle.

## Resolver Configuration

A fully configured resolver:

```ts
@GqlResolver(PostEntity, {
  name: 'Post',
  hooks: PostHooks,
  queries: {
    list: { name: 'posts', pagination: 'cursor' },
    findById: { name: 'post' },
    count: { name: 'postsCount' },
    aggregate: { name: 'postsAggregate' },
  },
  mutations: {
    createOne: { name: 'createPost' },
    updateOne: { name: 'updatePost' },
    deleteOne: { name: 'deletePost' },
  },
  filterable: ['id', 'title', 'published', 'author'],
  orderable: ['id', 'title', 'createdAt'],
})
export class PostsResolver extends RelayerResolver<PostEntity, EM, AppContext, AppQueryContext> {
  constructor(postsService: PostsService) {
    super(postsService);
  }
}
```

### Config reference

| Option                    | Type                                     | Default        | Description                                     |
| ------------------------- | ---------------------------------------- | -------------- | ----------------------------------------------- |
| `name`                    | `string`                                 | Entity name    | GraphQL type name prefix                        |
| `queries.list`            | `boolean \| { pagination?, name? }`      | `true`, cursor | List query. Set `false` to disable              |
| `queries.list.pagination` | `'offset' \| 'cursor' \| 'cursor-edges'` | `'cursor'`     | Pagination strategy                             |
| `queries.findById`        | `boolean \| { name? }`                   | `true`         | Find by ID query                                |
| `queries.count`           | `boolean \| { name? }`                   | `true`         | Count query                                     |
| `queries.aggregate`       | `boolean \| { name? }`                   | `true`         | Aggregate query                                 |
| `mutations.createOne`     | `boolean \| { name? }`                   | `true`         | Create mutation                                 |
| `mutations.updateOne`     | `boolean \| { name? }`                   | `true`         | Update mutation                                 |
| `mutations.deleteOne`     | `boolean \| { name? }`                   | `true`         | Delete mutation                                 |
| `fields`                  | `{ include?, exclude? }`                 | All fields     | Whitelist or blacklist fields in GraphQL schema |
| `filterable`              | `string[]`                               | All fields     | Fields allowed in `WhereInput`                  |
| `orderable`               | `string[]`                               | All fields     | Fields allowed in `OrderByInput`                |
| `hooks`                   | `class`                                  | -              | Lifecycle hooks class (injectable)              |
| `idField`                 | `string`                                 | `'id'`         | Primary key field name                          |
| `idType`                  | `'number' \| 'string'`                   | `'number'`     | Primary key GraphQL type (`ID` scalar)          |

### Disabling operations

```ts
@GqlResolver(PostEntity, {
  mutations: { deleteOne: false },
  queries: { aggregate: false },
})
```

### Default naming

For `name: 'Post'`:

| Operation | Default name     |
| --------- | ---------------- |
| list      | `posts`          |
| findById  | `post`           |
| count     | `postsCount`     |
| aggregate | `postsAggregate` |
| createOne | `createPost`     |
| updateOne | `updatePost`     |
| deleteOne | `deletePost`     |

## Pagination

Three pagination strategies. Pick one per resolver via `queries.list.pagination`.

### Cursor (default)

Flat items array with cursor-based pagination. The most ergonomic option for most clients.

```ts
@GqlResolver(UserEntity, {
  queries: { list: { pagination: 'cursor' } }, // or just omit pagination
})
```

```graphql
query {
  users(
    first: 10
    after: "eyJ..."
    where: { fullName: { contains: "Alice" } }
    orderBy: [{ createdAt: desc }]
  ) {
    items {
      id
      firstName
      lastName
      fullName
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

The client passes `pageInfo.endCursor` as `after` to get the next page. `totalCount` is lazy - only queried if selected.

### Offset

Classic limit/offset pagination. Familiar for anyone coming from REST.

```ts
@GqlResolver(PostEntity, {
  queries: { list: { pagination: 'offset' } },
})
```

```graphql
query {
  posts(limit: 20, offset: 0, where: { published: { eq: true } }, orderBy: [{ createdAt: desc }]) {
    items {
      id
      title
      published
    }
    totalCount
    hasMore
  }
}
```

> ⚠️ **Performance warning:** offset pagination degrades on large datasets. At `offset: 10000`, the database still scans and discards the first 10,000 rows before returning results. Fine for small-to-medium tables and admin UIs, but use cursor pagination for anything resembling an "infinite scroll" over a large collection.

### Cursor with edges (Relay-style)

Full edges + nodes wrapping. Use when you need a per-node cursor (e.g., resuming pagination from an arbitrary item in the middle of a page).

```ts
@GqlResolver(PostEntity, {
  queries: { list: { pagination: 'cursor-edges' } },
})
```

```graphql
query {
  posts(first: 10, after: "eyJ...") {
    edges {
      node {
        id
        title
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

### Which to pick?

- **`cursor`** - for 99% of cases. Flat, stable, simple to consume. Safe on any dataset size.
- **`offset`** - when clients need "jump to page N" or total page count visible upfront. Only for small-to-medium tables - avoid on huge datasets.
- **`cursor-edges`** - when you need per-node cursors (arbitrary resume point, Relay client compatibility).

## Filtering

Type-safe `where` inputs with rich operators, logical combinators, and relation filters:

```graphql
query {
  posts(
    where: {
      AND: [
        { title: { contains: "GraphQL", mode: insensitive } }
        { published: { eq: true } }
        { author: { email: { endsWith: "@company.com" } } }
      ]
    }
  ) {
    edges {
      node {
        id
        title
      }
    }
  }
}
```

### Filter operators

| Filter          | Operators                                                                    |
| --------------- | ---------------------------------------------------------------------------- |
| `StringFilter`  | eq, ne, in, notIn, contains, startsWith, endsWith, like, ilike, isNull, mode |
| `IntFilter`     | eq, ne, gt, gte, lt, lte, in, notIn, isNull                                  |
| `FloatFilter`   | eq, ne, gt, gte, lt, lte, in, notIn, isNull                                  |
| `BooleanFilter` | eq, ne, isNull                                                               |
| `DateFilter`    | eq, ne, gt, gte, lt, lte, in, notIn, isNull                                  |
| `IDFilter`      | eq, ne, in, notIn, isNull                                                    |
| `JsonFilter`    | eq, isNull                                                                   |

`StringFilter` supports a `mode` field (`default` | `insensitive`) for case-insensitive matching.

### Logical combinators

`AND`, `OR`, `NOT` - fully nestable:

```graphql
where: {
  OR: [
    { title: { contains: "NestJS" } }
    { AND: [
      { published: { eq: true } }
      { NOT: { authorId: { eq: 1 } } }
    ]}
  ]
}
```

### Relation filters

For has-many relations, filter by related records:

```graphql
where: {
  comments: { some: { content: { contains: "helpful" } } }
}
```

| Mode     | Meaning                              |
| -------- | ------------------------------------ |
| `some`   | At least one related record matches  |
| `every`  | All related records match            |
| `none`   | No related records match             |
| `exists` | `true` = has any, `false` = has none |

Use `filterable` in the resolver config to control which fields appear in `WhereInput`. Computed and derived fields are filterable too.

## Ordering

Sort by multiple fields, including nested relations:

```graphql
query {
  posts(orderBy: [{ createdAt: desc }, { title: asc }]) {
    edges {
      node {
        id
        title
        createdAt
      }
    }
  }
}
```

Nested ordering through to-one relations:

```graphql
query {
  posts(orderBy: [{ author: { lastName: asc } }]) {
    edges {
      node {
        id
        title
      }
    }
  }
}
```

`SortOrder` enum: `asc`, `desc`. Use `orderable` in the resolver config to whitelist sortable fields.

## Aggregation

```graphql
query {
  postsAggregate(
    where: { published: { eq: true } }
    groupBy: ["authorId"]
    _count: true
    _avg: { authorId: true }
    _min: { createdAt: true }
    _max: { createdAt: true }
  ) {
    data
  }
}
```

sum and avg accept numeric fields only. min, max, and count accept all scalar fields.

## Lifecycle Hooks

Hooks fire around each operation. They are injectable, receive fully typed arguments, and can modify data in-flight:

```ts
@Injectable()
export class PostHooks extends RelayerHooks<PostEntity, EM, AppContext> {
  private readonly logger = new Logger(PostHooks.name);

  afterFind(entities: PostEntity[], ctx: AppContext): void {
    this.logger.log(`Found ${entities.length} posts (user ${ctx.currentUser?.id ?? 'anon'})`);
  }

  afterCreate(entity: PostEntity, ctx: AppContext): void {
    this.logger.log(`Post created: ${entity.id}`);
  }

  afterUpdate(entity: PostEntity, ctx: AppContext): void {
    this.logger.log(`Post updated: ${entity.id}`);
  }

  afterDelete(entity: PostEntity, ctx: AppContext): void {
    this.logger.log(`Post deleted: ${entity.id}`);
  }
}
```

Register in resolver config and module providers:

```ts
@GqlResolver(PostEntity, { hooks: PostHooks })
```

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

## Relation Mutations

Manage many-to-many relations with dedicated mutations. Enable per-relation in the resolver config:

```ts
@GqlResolver(PostEntity, {
  name: 'Post',
  relations: {
    tags: true,
    postCategories: { include: ['isPrimary'] },
  },
})
```

This generates input types and three mutations per relation:

```graphql
# Shared input used by all remove mutations - only identifies the link target
input RelationIdInput {
  _id: ID!
}

# Per-relation input used by add/set - includes extra pivot columns via `include`
input PostPostCategoriesRelationInput {
  _id: ID!
  isPrimary: Boolean # optional because the pivot column has a default
}

type Mutation {
  addTagsToPost(id: ID!, items: [RelationIdInput!]!): RelationMutationResult!
  removeTagsFromPost(id: ID!, items: [RelationIdInput!]!): RelationMutationResult!
  setTagsOnPost(id: ID!, items: [RelationIdInput!]!): RelationMutationResult!

  addPostCategoriesToPost(
    id: ID!
    items: [PostPostCategoriesRelationInput!]!
  ): RelationMutationResult!
  removePostCategoriesFromPost(id: ID!, items: [RelationIdInput!]!): RelationMutationResult!
  setPostCategoriesOnPost(
    id: ID!
    items: [PostPostCategoriesRelationInput!]!
  ): RelationMutationResult!
}
```

| Operation | Pattern                        | Example              | Input type                   |
| --------- | ------------------------------ | -------------------- | ---------------------------- |
| Add       | `add{Relation}To{Entity}`      | `addTagsToPost`      | `{Parent}{Rel}RelationInput` |
| Remove    | `remove{Relation}From{Entity}` | `removeTagsFromPost` | `RelationIdInput`            |
| Set       | `set{Relation}On{Entity}`      | `setTagsOnPost`      | `{Parent}{Rel}RelationInput` |

- **add** - connect items to the relation (existing links preserved)
- **remove** - disconnect items from the relation
- **set** - replace all links (disconnect existing + connect new)

### Items shape

**Remove** uses the shared `RelationIdInput` (only `_id` is needed to match a link for disconnect):

```graphql
mutation {
  removeTagsFromPost(id: 1, items: [{ _id: 5 }]) {
    success
  }
}
```

**Add** and **set** use a per-relation input with `_id` plus any extra pivot columns declared via `include`:

```graphql
mutation {
  addTagsToPost(id: 1, items: [{ _id: 5 }, { _id: 6 }]) {
    success
  }
}
```

### Extra pivot columns

When a join table has columns beyond the two foreign keys (like `isPrimary`, `order`, `role`), expose them via the `include` option. The per-relation `add`/`set` input type gains typed fields for each included column:

```ts
relations: {
  postCategories: { include: ['isPrimary'] },
}
```

```graphql
mutation {
  addPostCategoriesToPost(
    id: 1
    items: [{ _id: 5, isPrimary: true }, { _id: 6, isPrimary: false }]
  ) {
    success
  }
}
```

Nullability of extra columns mirrors the database schema. `NOT NULL` columns without a default become required inputs, everything else becomes optional.

Relation hooks (`beforeRelation`, `afterRelation`) fire for all three operations and receive the full items array (including any extra columns).

## Typed Context

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
    const userId = Number(request?.headers?.['x-user-id'] ?? '0');
    const role = (request?.headers?.['x-user-role'] ?? 'user') as 'admin' | 'user';
    return { request, currentUser: { id: userId, role } };
  }

  protected buildQueryContext(ctx: AppContext): AppQueryContext {
    return {
      currentUserId: ctx.currentUser.id,
      isAdmin: ctx.currentUser.role === 'admin',
    };
  }
}
```

The query context is forwarded to the service, where `getDefaultWhere` can use it for row-level scoping:

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

## Field Selection

### Include / Exclude

Control which entity fields are exposed in the GraphQL schema:

```ts
@GqlResolver(UserEntity, {
  fields: { exclude: ['password', 'refreshToken'] },
})
```

Or use `include` for a whitelist approach:

```ts
@GqlResolver(UserEntity, {
  fields: { include: ['id', 'firstName', 'lastName', 'fullName', 'email'] },
})
```

### Automatic selection optimization

The package traverses the GraphQL `info` tree and translates the client's selection set into a minimal Relayer `select` clause. Only the fields the client actually requested are fetched from the database. Relations are loaded only when selected. This is automatic, no configuration needed.

## Module Options

| Option                 | Type                      | Required | Default | Description                             |
| ---------------------- | ------------------------- | -------- | ------- | --------------------------------------- |
| `db`                   | Drizzle instance          | Yes      | -       | Drizzle database connection             |
| `schema`               | `Record<string, unknown>` | Yes      | -       | Drizzle schema (tables + relations)     |
| `entities`             | `RelayerEntityClass[]`    | Yes      | -       | Entity classes to register              |
| `maxRelationDepth`     | `number`                  | No       | -       | Max depth for nested relation loading   |
| `defaultRelationLimit` | `number`                  | No       | -       | Default limit for relation arrays       |
| `graphql`              | `Record<string, unknown>` | No       | `{}`    | Overrides for `GraphQLModule.forRoot()` |

The `graphql` overrides are spread into the Apollo driver config, so you can pass `playground`, `introspection`, `cors`, etc.

## License

MIT
