---
title: Types
description: All auto-generated GraphQL types and how they map to your entities.
---

Every `@GqlResolver` generates a set of GraphQL types from your entity metadata. This page documents what gets generated and how each type is structured.

## ObjectType

The main entity type. Generated from scalar fields, computed fields, derived fields, and relations.

```graphql
type User {
  id: ID!
  email: String!
  firstName: String!
  lastName: String
  fullName: String # computed field (always nullable)
  postsCount: Float # derived field (always nullable)
  createdAt: DateTime!
  metadata: JSON
  posts: [Post!]! # many relation
  profile: Profile # one relation (nullable)
}
```

**Scalar type mapping:**

| Entity field type | GraphQL type | Notes                         |
| ----------------- | ------------ | ----------------------------- |
| Primary key       | `ID`         | Regardless of underlying type |
| Number + "id"     | `Int`        | Fields with "id" in the name  |
| Number            | `Float`      | All other numeric fields      |
| Boolean           | `Boolean`    |                               |
| Date / DateTime   | `DateTime`   |                               |
| JSON / Array      | `JSON`       | Uses `graphql-scalars`        |
| String / Enum     | `String`     |                               |

**Nullable rules:**

| Field category  | Nullable?                 |
| --------------- | ------------------------- |
| Scalar fields   | Per database schema       |
| Computed fields | Always nullable           |
| Derived fields  | Always nullable           |
| One relations   | Nullable                  |
| Many relations  | Non-null array `[Type!]!` |

## Filter inputs

Each scalar type has a corresponding filter input with type-specific operators.

### StringFilter

```graphql
input StringFilter {
  eq: String
  ne: String
  in: [String!]
  notIn: [String!]
  contains: String
  startsWith: String
  endsWith: String
  like: String
  ilike: String
  isNull: Boolean
  mode: FilterMode # default | insensitive
}
```

### IntFilter / FloatFilter

```graphql
input IntFilter {
  eq: Int
  ne: Int
  gt: Int
  gte: Int
  lt: Int
  lte: Int
  in: [Int!]
  notIn: [Int!]
  isNull: Boolean
}
```

`FloatFilter` has the same operators with `Float` types.

### BooleanFilter

```graphql
input BooleanFilter {
  eq: Boolean
  ne: Boolean
  isNull: Boolean
}
```

### DateFilter

```graphql
input DateFilter {
  eq: DateTime
  ne: DateTime
  gt: DateTime
  gte: DateTime
  lt: DateTime
  lte: DateTime
  in: [DateTime!]
  notIn: [DateTime!]
  isNull: Boolean
}
```

### IDFilter

```graphql
input IDFilter {
  eq: ID
  ne: ID
  in: [ID!]
  notIn: [ID!]
  isNull: Boolean
}
```

### JsonFilter

```graphql
input JsonFilter {
  eq: JSON
  isNull: Boolean
}
```

## WhereInput

Generated per entity. Contains a filter field for each scalar/computed/derived field, nested where for one-relations, relation filters for many-relations, and logical combinators.

```graphql
input PostWhereInput {
  id: IDFilter
  title: StringFilter
  published: BooleanFilter
  createdAt: DateFilter

  # one relation - nested where
  author: UserWhereInput

  # many relation - relation filter
  comments: PostCommentsRelationFilter

  # logical combinators
  AND: [PostWhereInput!]
  OR: [PostWhereInput!]
  NOT: PostWhereInput
}
```

Only fields listed in `filterable` appear here (if specified).

## Relation filters

For has-many relations, a dedicated filter type is generated:

```graphql
input PostCommentsRelationFilter {
  some: CommentWhereInput # at least one match
  every: CommentWhereInput # all match
  none: CommentWhereInput # no matches
  exists: Boolean # has any / has none
}
```

## OrderByInput

Generated per entity. Contains a `SortOrder` field for each scalar/computed/derived field and nested ordering for one-relations.

```graphql
input PostOrderByInput {
  id: SortOrder
  title: SortOrder
  published: SortOrder
  createdAt: SortOrder
  author: UserOrderByInput # nested ordering through one-relation
}

enum SortOrder {
  asc
  desc
}
```

Many-relations are **not** included in OrderByInput. Only fields listed in `orderable` appear here (if specified).

## CreateInput

All scalar fields except the primary key. Fields are optional if nullable in the schema or if they have a default value.

```graphql
input CreatePostInput {
  title: String! # required
  content: String # optional (nullable in DB)
  published: Boolean # optional (has default)
  authorId: Int! # required
}
```

## UpdateInput

Same fields as CreateInput, but **all fields are optional**:

```graphql
input UpdatePostInput {
  title: String
  content: String
  published: Boolean
  authorId: Int
}
```

## Connection (cursor pagination)

```graphql
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int # nullable - only resolved when selected
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

## ListResult (offset pagination)

```graphql
type PostListResult {
  items: [Post!]!
  totalCount: Int!
  hasMore: Boolean!
}
```

## Aggregate

```graphql
type PostAggregate {
  data: JSON!
}

# for sum/avg operations - only numeric fields
input PostAggregateNumericFieldsInput {
  id: Boolean
  authorId: Boolean
}

# for min/max operations - all scalar fields
input PostAggregateAllFieldsInput {
  id: Boolean
  title: Boolean
  authorId: Boolean
  createdAt: Boolean
}
```
