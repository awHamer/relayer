---
title: Aggregations
description: count, aggregate with _sum, _avg, _min, _max, groupBy, and dot-notation cross-table grouping.
---

## count

Count records with an optional filter:

```ts
// Count all users
const total = await r.users.count();
// 42

// Count with filter
const admins = await r.users.count({
  where: { metadata: { role: 'admin' } },
});
// 5
```

## aggregate

Run aggregation functions with optional grouping:

```ts
const stats = await r.orders.aggregate({
  groupBy: ['status'],
  _count: true,
  _sum: { total: true },
  _avg: { total: true },
  _min: { total: true },
  _max: { total: true },
});
// [
//   { status: 'completed', _count: 3, _sum_total: 5000, _avg_total: 1666, _min_total: 500, _max_total: 3000 },
//   { status: 'pending', _count: 2, _sum_total: 1500, _avg_total: 750, _min_total: 500, _max_total: 1000 },
// ]
```

### Available functions

| Function                | Description             | Result key   |
| ----------------------- | ----------------------- | ------------ |
| `_count: true`          | Count of rows           | `_count`     |
| `_sum: { field: true }` | Sum of field values     | `_sum_field` |
| `_avg: { field: true }` | Average of field values | `_avg_field` |
| `_min: { field: true }` | Minimum value           | `_min_field` |
| `_max: { field: true }` | Maximum value           | `_max_field` |

Multiple fields can be aggregated at once:

```ts
const stats = await r.orders.aggregate({
  _sum: { total: true, quantity: true },
  _avg: { total: true },
});
// { _count: undefined, _sum_total: 10000, _sum_quantity: 50, _avg_total: 500 }
```

### Without groupBy

When no `groupBy` is specified, the result is a single object (not an array):

```ts
const total = await r.users.aggregate({ _count: true });
// { _count: 42 }
```

### With groupBy

When `groupBy` is specified, the result is an array with one entry per group:

```ts
const byStatus = await r.orders.aggregate({
  groupBy: ['status'],
  _count: true,
  _sum: { total: true },
});
// [
//   { status: 'completed', _count: 3, _sum_total: 5500 },
//   { status: 'pending', _count: 2, _sum_total: 1500 },
// ]
```

## Dot-notation groupBy

Group by a field from a related table. Relayer automatically generates a LEFT JOIN:

```ts
const ordersByUser = await r.orders.aggregate({
  groupBy: ['user.firstName'],
  _count: true,
  _sum: { total: true },
});
// [
//   { user_firstName: 'Ihor', _count: 2, _sum_total: 2000 },
//   { user_firstName: 'John', _count: 3, _sum_total: 3500 },
// ]
```

The dot notation `'user.firstName'` tells Relayer to:

1. Follow the `user` relation from `orders`
2. LEFT JOIN the `users` table
3. Group by `users.first_name`
4. Return the result as `user_firstName`

## Filtering aggregations

Use `where` to filter before aggregating:

```ts
const completedStats = await r.orders.aggregate({
  where: { status: 'completed' },
  groupBy: ['status'],
  _count: true,
  _sum: { total: true },
});
// [{ status: 'completed', _count: 3, _sum_total: 5500 }]
```

The `where` clause supports all the same operators as `findMany`.
