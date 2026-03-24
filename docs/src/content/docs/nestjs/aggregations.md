---
title: 'NestJS: Aggregations'
description: Count, sum, average, min, max with groupBy -- all via a single GET endpoint.
---

Relayer gives you a powerful aggregation endpoint out of the box. No custom SQL, no manual controller logic -- just enable it and go.

## Enabling

```ts
@CrudController({
  model: PostEntity,
  routes: {
    aggregate: true,
  },
})
```

This creates `GET /posts/aggregate`.

## Count

How many posts?

```
GET /posts/aggregate?_count=true
```

```json
{ "data": { "_count": 42 } }
```

## Group by

How many posts per author?

```
GET /posts/aggregate?_count=true&groupBy=authorId
```

```json
{
  "data": [
    { "_count": 15, "authorId": 1 },
    { "_count": 12, "authorId": 2 },
    { "_count": 15, "authorId": 3 }
  ]
}
```

Multiple groups (comma-separated):

```
GET /posts/aggregate?_count=true&groupBy=authorId,published
```

## Group by relation fields

This is where it gets interesting. Group by a field from a related table using dot notation:

```
GET /posts/aggregate?_count=true&groupBy=author.fullName
```

```json
{
  "data": [
    { "_count": 15, "author": { "fullName": "Ihor Ivanov" } },
    { "_count": 12, "author": { "fullName": "John Doe" } },
    { "_count": 15, "author": { "fullName": "Jane Smith" } }
  ]
}
```

Relayer auto-generates a LEFT JOIN to the related table. Works with computed and derived fields too.

## Sum, Average, Min, Max

All aggregate functions, all in one request:

```
GET /orders/aggregate?groupBy=status&_count=true&_sum={"total":true}&_avg={"total":true}&_min={"total":true}&_max={"total":true}
```

```json
{
  "data": [
    {
      "_count": 3,
      "_sum": { "total": "5000.00" },
      "_avg": { "total": "1666.67" },
      "_min": { "total": "500.00" },
      "_max": { "total": "3000.00" },
      "status": "completed"
    },
    {
      "_count": 1,
      "_sum": { "total": "200.00" },
      "_avg": { "total": "200.00" },
      "_min": { "total": "200.00" },
      "_max": { "total": "200.00" },
      "status": "pending"
    }
  ]
}
```

## Filtering aggregations

Combine with `where` to aggregate a subset:

```
GET /posts/aggregate?_count=true&groupBy=published&where={"authorId":1}
```

Only counts posts by author 1:

```json
{
  "data": [{ "_count": 2, "published": true }]
}
```

## Query parameters reference

| Parameter | Type              | Description                           |
| --------- | ----------------- | ------------------------------------- |
| `_count`  | `true`            | Include count in result               |
| `_sum`    | `{"field": true}` | Sum of field values                   |
| `_avg`    | `{"field": true}` | Average of field values               |
| `_min`    | `{"field": true}` | Minimum value                         |
| `_max`    | `{"field": true}` | Maximum value                         |
| `groupBy` | `field` or JSON   | Group by one or more fields           |
| `where`   | JSON              | Filter before aggregating             |
| `having`  | JSON              | Filter after aggregating (on results) |

## Compared to raw SQL

What would normally require:

```sql
SELECT author.full_name, COUNT(*), SUM(total), AVG(total)
FROM orders
LEFT JOIN users ON orders.user_id = users.id
WHERE status = 'completed'
GROUP BY author.full_name
HAVING COUNT(*) > 5
```

Becomes:

```
GET /orders/aggregate?groupBy=user.fullName&_count=true&_sum={"total":true}&_avg={"total":true}&where={"status":"completed"}&having={"_count":{"gt":5}}
```

No SQL, no custom endpoint, full type safety under the hood.
