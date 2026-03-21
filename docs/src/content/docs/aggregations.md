---
title: Aggregations
description: count, aggregate with _sum, _avg, _min, _max, groupBy, having, and dot-notation cross-table grouping.
---

## count

Count records with an optional filter:

```ts
const total = await r.users.count();
// 42

const admins = await r.users.count({
  where: { metadata: { role: 'admin' } },
});
// 5
```

## aggregate

Run aggregation functions with optional grouping. Results are nested objects:

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
//   {
//     status: 'completed',
//     _count: 3,
//     _sum: { total: 5000 },
//     _avg: { total: 1666 },
//     _min: { total: 500 },
//     _max: { total: 3000 },
//   },
//   {
//     status: 'pending',
//     _count: 2,
//     _sum: { total: 1500 },
//     _avg: { total: 750 },
//     _min: { total: 500 },
//     _max: { total: 1000 },
//   },
// ]
```

### Available functions

| Function                | Description             | Result format             |
| ----------------------- | ----------------------- | ------------------------- |
| `_count: true`          | Count of rows           | `_count: number`          |
| `_sum: { field: true }` | Sum of field values     | `_sum: { field: number }` |
| `_avg: { field: true }` | Average of field values | `_avg: { field: number }` |
| `_min: { field: true }` | Minimum value           | `_min: { field: number }` |
| `_max: { field: true }` | Maximum value           | `_max: { field: number }` |

All aggregate values are coerced to `number`. Multiple fields can be aggregated at once:

```ts
const stats = await r.orders.aggregate({
  _sum: { total: true, quantity: true },
  _avg: { total: true },
});
// { _sum: { total: 10000, quantity: 50 }, _avg: { total: 500 } }
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
//   { status: 'completed', _count: 3, _sum: { total: 5500 } },
//   { status: 'pending', _count: 2, _sum: { total: 1500 } },
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
//   { user: { firstName: 'Ihor' }, _count: 2, _sum: { total: 2000 } },
//   { user: { firstName: 'John' }, _count: 3, _sum: { total: 3500 } },
// ]
```

The dot notation `'user.firstName'` tells Relayer to:

1. Follow the `user` relation from `orders`
2. LEFT JOIN the `users` table
3. Group by `users.first_name`
4. Return the result nested as `user: { firstName: '...' }`

## Filtering with where

Use `where` to filter rows **before** grouping:

```ts
const completedStats = await r.orders.aggregate({
  where: { status: 'completed' },
  groupBy: ['status'],
  _count: true,
  _sum: { total: true },
});
// [{ status: 'completed', _count: 3, _sum: { total: 5500 } }]
```

## Filtering with having

Use `having` to filter groups **after** aggregation:

```ts
const bigGroups = await r.orders.aggregate({
  groupBy: ['status'],
  _count: true,
  _sum: { total: true },
  having: { _count: { gte: 3 } },
});
// Only groups with 3+ orders
```

`having` supports the same numeric operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`.
