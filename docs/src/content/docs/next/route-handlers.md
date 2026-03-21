---
title: Route Handlers
description: All 7 route handlers — list, findById, create, update, remove, count, aggregate.
---

## Overview

`createRelayerRoute()` returns a route factory with 7 handler methods. Each returns a Next.js-compatible route handler function.

```ts
const userRoutes = createRelayerRoute(r, 'users', config);
```

## list()

Returns records with filtering, sorting, and pagination.

```ts
export const GET = userRoutes.list();
```

**HTTP:** `GET /api/users?where={"email":{"contains":"@gmail.com"}}&orderBy={"field":"name","order":"asc"}&limit=10&offset=0`

**Query params:**

| Param     | Type        | Description                         |
| --------- | ----------- | ----------------------------------- |
| `where`   | JSON string | Filter conditions                   |
| `select`  | JSON string | Field selection                     |
| `orderBy` | JSON string | Sort configuration                  |
| `sort`    | string      | Shorthand: `-createdAt,+name`       |
| `limit`   | number      | Max records (clamped to `maxLimit`) |
| `offset`  | number      | Skip records                        |

**Response:**

```json
{
  "data": [{ "id": 1, "name": "John" }],
  "meta": { "total": 42, "limit": 20, "offset": 0 }
}
```

## findById()

Returns a single record by ID.

```ts
export const GET = userRoutes.findById();
```

**HTTP:** `GET /api/users/1`

**Response:**

```json
{ "data": { "id": 1, "name": "John", "email": "john@test.com" } }
```

Returns `404` if not found.

## create()

Creates a new record. Request body IS the data (no `{ data: ... }` wrapper).

```ts
export const POST = userRoutes.create();
```

**HTTP:** `POST /api/users` with body `{ "name": "John", "email": "john@test.com" }`

**Response (201):**

```json
{ "data": { "id": 3, "name": "John", "email": "john@test.com" } }
```

## update()

Updates a record by ID.

```ts
export const PATCH = userRoutes.update();
```

**HTTP:** `PATCH /api/users/1` with body `{ "name": "Updated" }`

**Response:**

```json
{ "data": { "id": 1, "name": "Updated", "email": "john@test.com" } }
```

## remove()

Deletes a record by ID.

```ts
export const DELETE = userRoutes.remove();
```

**HTTP:** `DELETE /api/users/1`

**Response:**

```json
{ "data": { "id": 1, "name": "John", "email": "john@test.com" } }
```

## count()

Returns the count of matching records.

```ts
export const GET = userRoutes.count();
```

**HTTP:** `GET /api/users/count?where={"role":"admin"}`

**Response:**

```json
{ "data": { "count": 42 } }
```

## aggregate()

Runs aggregate functions with optional groupBy.

```ts
export const GET = userRoutes.aggregate();
```

**HTTP:** `GET /api/users/aggregate?groupBy=["status"]&_count=true&_sum={"total":true}`

**Response:**

```json
{ "data": [{ "status": "active", "_count": 10, "_sum_total": 5000 }] }
```

## Shorthand vs full control

**Shorthand** — one line, no hooks:

```ts
export const { GET, POST } = userRoutes.handlers();
export const { GET, PATCH, DELETE } = userRoutes.detailHandlers();
```

**Full control** — per-handler hooks:

```ts
export const GET = userRoutes.list({ beforeFind: ... });
export const POST = userRoutes.create({ beforeCreate: ... });
```

See [Hooks](/next/hooks/) for all available hooks.
