---
title: Resolvers
description: Configure auto-generated GraphQL resolvers with @GqlResolver.
---

The `@GqlResolver` decorator turns a Relayer entity into a full GraphQL resolver. One decorator generates all queries, mutations, input types, and filter types.

## Basic resolver

The simplest resolver needs just the entity class and a name:

```ts
import { GqlResolver, RelayerResolver } from '@relayerjs/nestjs-graphql';

@GqlResolver(UserEntity, { name: 'User' })
export class UsersResolver extends RelayerResolver<UserEntity, EM> {
  constructor(usersService: UsersService) {
    super(usersService);
  }
}
```

This generates **4 queries** and **3 mutations** with all the input/output types. See the full list in [Generated operations](#generated-operations).

## Config overview

```ts
@GqlResolver(PostEntity, {
  // GraphQL type name prefix: "Post" -> PostWhereInput, CreatePostInput, etc.
  name: 'Post',

  // Lifecycle hooks class (NestJS injectable)
  hooks: PostHooks,

  // Control which queries exist and how they behave
  queries: {
    list: { name: 'posts', pagination: 'both' },
    findById: { name: 'post' },
    count: { name: 'postsCount' },
    aggregate: { name: 'postsAggregate' },
  },

  // Control which mutations exist
  mutations: {
    createOne: { name: 'createPost' },
    updateOne: { name: 'updatePost' },
    deleteOne: { name: 'deletePost' },
  },

  // Hide fields from the entire GraphQL schema
  fields: { exclude: ['password'] },

  // Only these fields appear in WhereInput (filtering)
  filterable: ['id', 'title', 'published', 'author'],

  // Only these fields appear in OrderByInput (sorting)
  orderable: ['id', 'title', 'createdAt'],

  // Primary key config (usually auto-detected)
  idField: 'id',
  idType: 'number',
})
```

## `name`

**Type:** `string` | **Default:** derived from entity class name

The prefix used for all generated GraphQL types. This is how you control the naming of everything:

```ts
@GqlResolver(PostEntity, { name: 'BlogPost' })
```

This generates: `BlogPost` (ObjectType), `BlogPostWhereInput`, `BlogPostOrderByInput`, `CreateBlogPostInput`, `UpdateBlogPostInput`, `BlogPostConnection`, `BlogPostAggregate`, etc.

## Queries

Each query can be:

- **`true`** (default) - enabled with auto-generated name
- **`false`** - disabled, not in the schema
- **`{ name?, pagination? }`** - enabled with custom options

### `queries.list`

The list query with pagination. This is the most configurable query.

```ts
queries: {
  list: { name: 'posts', pagination: 'both' },
}
```

**Sub-options:**

| Option       | Type                             | Default    | Description                           |
| ------------ | -------------------------------- | ---------- | ------------------------------------- |
| `name`       | `string`                         | `{plural}` | GraphQL operation name                |
| `pagination` | `'cursor' \| 'offset' \| 'both'` | `'cursor'` | Which pagination strategy to generate |

**Pagination modes explained:**

**`'cursor'`** (default) - generates one query returning a Connection:

```graphql
# query name: "posts"
posts(first: Int, after: String, where: ..., orderBy: ...): PostConnection!
```

**`'offset'`** - generates one query returning a ListResult:

```graphql
# query name: "posts"
posts(limit: Int, offset: Int, where: ..., orderBy: ...): PostListResult!
```

**`'both'`** - generates **two** queries. The cursor query uses the base name, the offset query gets an `Offset` suffix:

```graphql
# cursor: base name
posts(first: Int, after: String, where: ..., orderBy: ...): PostConnection!

# offset: base name + "Offset"
postsOffset(limit: Int, offset: Int, where: ..., orderBy: ...): PostListResult!
```

With a custom name:

```ts
list: { name: 'allPosts', pagination: 'both' }
// -> allPosts (cursor) + allPostsOffset (offset)
```

### `queries.findById`

Find a single entity by its primary key.

```ts
queries: {
  findById: { name: 'post' },
}
```

| Option | Type     | Default      | Description            |
| ------ | -------- | ------------ | ---------------------- |
| `name` | `string` | `{singular}` | GraphQL operation name |

Generates:

```graphql
post(id: ID!): Post
```

Returns `null` if not found (throws `NotFoundException` internally).

### `queries.count`

Count records matching a filter.

```ts
queries: {
  count: { name: 'postsCount' },
}
```

| Option | Type     | Default         | Description            |
| ------ | -------- | --------------- | ---------------------- |
| `name` | `string` | `{plural}Count` | GraphQL operation name |

Generates:

```graphql
postsCount(where: PostWhereInput): Int!
```

### `queries.aggregate`

Aggregation with groupBy, count, sum, avg, min, max.

```ts
queries: {
  aggregate: { name: 'postsAggregate' },
}
```

| Option | Type     | Default             | Description            |
| ------ | -------- | ------------------- | ---------------------- |
| `name` | `string` | `{plural}Aggregate` | GraphQL operation name |

Generates:

```graphql
postsAggregate(
  where: PostWhereInput
  groupBy: [String!]
  _count: Boolean
  _sum: PostAggregateNumericFieldsInput
  _avg: PostAggregateNumericFieldsInput
  _min: PostAggregateAllFieldsInput
  _max: PostAggregateAllFieldsInput
): PostAggregate!
```

## Mutations

Each mutation can be `true`, `false`, or `{ name? }`.

### `mutations.createOne`

```ts
mutations: {
  createOne: { name: 'createPost' },
}
```

| Option | Type     | Default        | Description            |
| ------ | -------- | -------------- | ---------------------- |
| `name` | `string` | `create{Name}` | GraphQL operation name |

Generates:

```graphql
createPost(data: CreatePostInput!): Post!
```

### `mutations.updateOne`

```ts
mutations: {
  updateOne: { name: 'updatePost' },
}
```

| Option | Type     | Default        | Description            |
| ------ | -------- | -------------- | ---------------------- |
| `name` | `string` | `update{Name}` | GraphQL operation name |

Generates:

```graphql
updatePost(id: ID!, data: UpdatePostInput!): Post!
```

Throws `NotFoundException` if the entity does not exist.

### `mutations.deleteOne`

```ts
mutations: {
  deleteOne: { name: 'deletePost' },
}
```

| Option | Type     | Default        | Description            |
| ------ | -------- | -------------- | ---------------------- |
| `name` | `string` | `delete{Name}` | GraphQL operation name |

Generates:

```graphql
deletePost(id: ID!): Post!
```

Throws `NotFoundException` if the entity does not exist.

## Disabling operations

Set any operation to `false`:

```ts
@GqlResolver(PostEntity, {
  mutations: { deleteOne: false },
  queries: { aggregate: false },
})
```

Read-only resolver (no mutations):

```ts
@GqlResolver(PostEntity, {
  mutations: { createOne: false, updateOne: false, deleteOne: false },
})
```

## Generated operations

For `name: 'Post'`, this is the full default output:

| Type     | Operation                  | Description                        |
| -------- | -------------------------- | ---------------------------------- |
| Query    | `posts`                    | Cursor-paginated list (Connection) |
| Query    | `post(id: ID!)`            | Find by ID                         |
| Query    | `postsCount(where: ...)`   | Count matching records             |
| Query    | `postsAggregate(...)`      | Aggregation with groupBy           |
| Mutation | `createPost(data: ...)`    | Create one                         |
| Mutation | `updatePost(id: ID!, ...)` | Update one                         |
| Mutation | `deletePost(id: ID!)`      | Delete one                         |

**Naming pattern:**

| Operation | Pattern             | Example          |
| --------- | ------------------- | ---------------- |
| List      | `{plural}`          | `posts`          |
| Find      | `{singular}`        | `post`           |
| Count     | `{plural}Count`     | `postsCount`     |
| Aggregate | `{plural}Aggregate` | `postsAggregate` |
| Create    | `create{Name}`      | `createPost`     |
| Update    | `update{Name}`      | `updatePost`     |
| Delete    | `delete{Name}`      | `deletePost`     |

## `fields`

**Type:** `{ include?: string[], exclude?: string[] }`

Controls which entity fields appear in the GraphQL schema. Affects the ObjectType, CreateInput, UpdateInput, WhereInput, and OrderByInput.

### Exclude (blacklist)

```ts
@GqlResolver(UserEntity, {
  fields: { exclude: ['password', 'refreshToken'] },
})
```

All fields are included except the listed ones.

### Include (whitelist)

```ts
@GqlResolver(UserEntity, {
  fields: { include: ['id', 'firstName', 'lastName', 'fullName', 'email'] },
})
```

Only the listed fields are included.

## `filterable`

**Type:** `string[]` | **Default:** all fields

Restricts which fields appear in the generated `WhereInput`. By default all entity fields (including computed and derived) are filterable.

```ts
@GqlResolver(PostEntity, {
  filterable: ['id', 'title', 'published', 'author'],
})
```

Only `id`, `title`, `published`, and `author` will be available for filtering. The rest won't appear in `PostWhereInput`.

## `orderable`

**Type:** `string[]` | **Default:** all fields

Restricts which fields appear in the generated `OrderByInput`. By default all entity fields are orderable.

```ts
@GqlResolver(PostEntity, {
  orderable: ['id', 'title', 'createdAt'],
})
```

## `hooks`

**Type:** `class` | **Default:** none

Lifecycle hooks class. Must extend `RelayerHooks`. Can be an NestJS injectable.

```ts
@GqlResolver(PostEntity, { hooks: PostHooks })
```

See [Hooks & Context](/nestjs-graphql/hooks-and-context/) for details.

## `idField` / `idType`

**Type:** `string` / `'number' | 'string'` | **Default:** `'id'` / `'number'`

Override primary key detection. Usually auto-detected from the entity.

```ts
@GqlResolver(PostEntity, {
  idField: 'uuid',
  idType: 'string',
})
```

This changes the `id` argument in findById, updateOne, and deleteOne to use the specified field and type.

## Selection optimization

The resolver automatically reads the GraphQL `info` tree and translates the client's selection set into a minimal Relayer `select` clause. Only the fields the client requests are fetched from the database. Relations are loaded only when selected.

`totalCount` in both pagination modes is lazy - the count query only runs if the client includes it in the selection.

## Module registration

```ts
@Module({
  imports: [
    RelayerGraphqlModule.forRoot({
      db,
      schema,
      entities: [UserEntity, PostEntity, CommentEntity],
      defaultRelationLimit: 50,
    }),
    UsersModule,
    PostsModule,
  ],
})
export class AppModule {}
```

### Module options

| Option                 | Type                   | Required | Description                             |
| ---------------------- | ---------------------- | -------- | --------------------------------------- |
| `db`                   | Drizzle instance       | Yes      | Drizzle database connection             |
| `schema`               | `Record<string, ...>`  | Yes      | Drizzle schema (tables + relations)     |
| `entities`             | `RelayerEntityClass[]` | Yes      | Entity classes to register              |
| `maxRelationDepth`     | `number`               | No       | Max depth for nested relation loading   |
| `defaultRelationLimit` | `number`               | No       | Default limit for relation arrays       |
| `graphql`              | `Record<string, ...>`  | No       | Overrides for `GraphQLModule.forRoot()` |

The `graphql` overrides are spread into the Apollo driver config, so you can pass `playground`, `introspection`, `cors`, etc.
