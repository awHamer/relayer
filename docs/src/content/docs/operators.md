---
title: Operators
description: All 20+ filter operators available in the where clause.
---

Relayer provides 20+ operators for filtering in the `where` clause. The available operators depend on the field's type.

## Operator reference

| Operator         | Example                                          | Description                                              |
| ---------------- | ------------------------------------------------ | -------------------------------------------------------- |
| `eq`             | `{ name: 'John' }` or `{ name: { eq: 'John' } }` | Equal. Shorthand: passing a raw value is treated as `eq` |
| `ne`             | `{ name: { ne: 'John' } }`                       | Not equal                                                |
| `gt`             | `{ age: { gt: 18 } }`                            | Greater than                                             |
| `gte`            | `{ age: { gte: 18 } }`                           | Greater than or equal                                    |
| `lt`             | `{ age: { lt: 65 } }`                            | Less than                                                |
| `lte`            | `{ age: { lte: 65 } }`                           | Less than or equal                                       |
| `in`             | `{ id: { in: [1, 2, 3] } }`                      | Value is in array                                        |
| `notIn`          | `{ id: { notIn: [4, 5] } }`                      | Value is not in array                                    |
| `like`           | `{ email: { like: '%@gmail%' } }`                | SQL LIKE pattern match                                   |
| `notLike`        | `{ email: { notLike: '%spam%' } }`               | SQL NOT LIKE                                             |
| `ilike`          | `{ name: { ilike: '%john%' } }`                  | Case-insensitive LIKE                                    |
| `notIlike`       | `{ name: { notIlike: '%test%' } }`               | Case-insensitive NOT LIKE                                |
| `contains`       | `{ email: { contains: 'gmail' } }`               | Contains substring (wraps in `%...%`)                    |
| `startsWith`     | `{ name: { startsWith: 'Jo' } }`                 | Starts with prefix                                       |
| `endsWith`       | `{ email: { endsWith: '.com' } }`                | Ends with suffix                                         |
| `isNull`         | `{ deletedAt: { isNull: true } }`                | Is NULL                                                  |
| `isNotNull`      | `{ email: { isNotNull: true } }`                 | Is NOT NULL                                              |
| `arrayContains`  | `{ tags: { arrayContains: ['ts'] } }`            | Array contains all values (PG only)                      |
| `arrayContained` | `{ tags: { arrayContained: ['ts', 'js'] } }`     | Array is contained by values (PG only)                   |
| `arrayOverlaps`  | `{ tags: { arrayOverlaps: ['ts', 'js'] } }`      | Array has any overlap (PG only)                          |

## Operators by type

### String fields

All comparison operators plus text-specific ones:

```ts
await r.users.findMany({
  where: {
    email: { contains: 'gmail' },
    firstName: { startsWith: 'Jo' },
    lastName: { ilike: '%doe%' },
  },
});
```

Available: `eq`, `ne`, `in`, `notIn`, `like`, `notLike`, `ilike`, `notIlike`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`

### Number fields

Comparison and range operators:

```ts
await r.orders.findMany({
  where: {
    total: { gte: 100, lte: 1000 },
  },
});
```

Available: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `isNull`, `isNotNull`

### Boolean fields

```ts
await r.posts.findMany({
  where: { published: true },
  // or explicitly:
  // where: { published: { eq: true } },
});
```

Available: `eq`, `ne`, `isNull`, `isNotNull`

### Date fields

```ts
await r.users.findMany({
  where: {
    createdAt: { gte: new Date('2024-01-01') },
  },
});
```

Available: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `isNull`, `isNotNull`

### Array fields (PostgreSQL only)

```ts
await r.posts.findMany({
  where: { tags: { arrayContains: ['typescript'] } },
});

await r.posts.findMany({
  where: { tags: { arrayOverlaps: ['intro', 'draft'] } },
});

await r.posts.findMany({
  where: { tags: { arrayContained: ['typescript', 'tips', 'intro'] } },
});
```

Available: `arrayContains`, `arrayContained`, `arrayOverlaps`, `isNull`, `isNotNull`

:::caution
Array operators are only available with PostgreSQL. Using them with MySQL or SQLite will throw an error.
:::

## Shorthand equality

Passing a raw value instead of an operator object is treated as `eq`:

```ts
// These are equivalent:
await r.users.findMany({ where: { firstName: 'John' } });
await r.users.findMany({ where: { firstName: { eq: 'John' } } });
```

## Combining multiple operators

Multiple operators on the same field are combined with AND:

```ts
await r.orders.findMany({
  where: {
    total: { gte: 100, lte: 1000 },
  },
});
// WHERE total >= 100 AND total <= 1000
```

## Operators on computed and derived fields

Computed and derived fields support the same operators based on their `valueType`:

```ts
// Computed field (valueType: 'string')
await r.users.findMany({
  where: { fullName: { contains: 'John' } },
});

// Derived field (valueType: 'number')
await r.users.findMany({
  where: { postsCount: { gte: 5 } },
});

// Object-type derived field sub-fields
await r.users.findMany({
  where: { orderSummary: { orderCount: { gte: 1 } } },
});
```
