---
title: 'NestJS: Search & Filtering'
description: How clients query your API -- filtering, search, sorting, relations, and pagination.
---

Your API clients can filter, search, sort, paginate, and load relations -- all via query parameters. No custom code needed.

## Filtering

Pass a JSON `where` parameter:

```
GET /posts?where={"published":true}
GET /posts?where={"title":{"contains":"hello"}}
GET /posts?where={"createdAt":{"gte":"2025-01-01"}}
```

Combine conditions:

```
GET /posts?where={"AND":[{"published":true},{"authorId":1}]}
GET /posts?where={"OR":[{"title":{"contains":"js"}},{"title":{"contains":"ts"}}]}
```

Relayer supports 20+ operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `contains`, `ilike`, `startsWith`, `isNull`, and more. See the [Operators reference](/operators/) for the full list.

Case-insensitive search without `ilike`:

```
GET /posts?where={"title":{"contains":"hello","mode":"insensitive"}}
```

### Relation filters

Filter by related data:

```
GET /posts?where={"comments":{"exists":true}}
GET /users?where={"posts":{"some":{"published":true}}}
```

## Search

Add `search` to your route config:

```ts
@CrudController({
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

Clients search with:

```
GET /posts?search=hello
GET /posts?search=typescript&where={"published":true}
```

Search is AND-merged with other where conditions. Also applied to the `/count` endpoint.

## Sorting

JSON format:

```
GET /posts?orderBy={"field":"createdAt","order":"desc"}
GET /posts?orderBy=[{"field":"title","order":"asc"},{"field":"createdAt","order":"desc"}]
```

Shorthand format:

```
GET /posts?sort=-createdAt
GET /posts?sort=+title,-createdAt
```

`-` = descending, `+` = ascending.

## Selecting fields

By default, all scalar fields are returned. Use `select` to pick specific fields:

```
GET /posts?select={"id":true,"title":true}
```

## Loading relations

Include related data via `select`:

```
GET /posts?select={"id":true,"title":true,"comments":{"id":true,"content":true}}
```

Nested relations:

```
GET /posts?select={"id":true,"comments":{"id":true,"author":{"fullName":true}}}
```

### Limiting relation rows

Use `$limit` to cap how many related rows are returned per parent:

```
GET /posts?select={"id":true,"comments":{"$limit":5,"id":true,"content":true}}
```

Each post gets at most 5 comments. `$limit` is per-parent, not global.

Server-side limits can be enforced via `allow.select` config -- see [Configuration](/nestjs/configuration).

> **Note:** The limiting strategy depends on what fields are selected. See [Known Limitations](/nestjs/limitations#relation-row-limits-limit) for details on SQL vs JS limiting and performance considerations.

## Pagination

### Offset-based (default)

```
GET /posts?limit=20&offset=0     -- page 1
GET /posts?limit=20&offset=20    -- page 2
```

Response includes `nextPageUrl` for the next page:

```json
{
  "data": [...],
  "meta": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "nextPageUrl": "/posts?offset=20&limit=20"
  }
}
```

### Cursor-based

When configured with `pagination: 'cursor_UNSTABLE'`:

```
GET /posts?limit=20              -- page 1
GET /posts?limit=20&cursor=...   -- page 2
```

Response:

```json
{
  "data": [...],
  "meta": {
    "limit": 20,
    "hasMore": true,
    "nextCursor": "base64...",
    "nextPageUrl": "/posts?cursor=...&limit=20"
  }
}
```

No `total` in cursor mode -- no count query needed, better for large datasets.

## Count

```
GET /posts/count
GET /posts/count?where={"published":true}
GET /posts/count?search=hello
```

Returns:

```json
{ "data": { "count": 42 } }
```

## All together

```
GET /posts?search=typescript&where={"published":true}&orderBy={"field":"createdAt","order":"desc"}&select={"id":true,"title":true,"comments":{"$limit":3,"content":true}}&limit=10
```

One request: search + filter + sort + relations with limit + pagination.
