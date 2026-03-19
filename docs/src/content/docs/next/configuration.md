---
title: Configuration
description: Restrict select, where, and orderBy fields for API security.
---

## Overview

The third argument to `createRelayerRoute()` is a configuration object that controls what clients can query:

```ts
const userRoutes = createRelayerRoute(r, 'users', {
  allowSelect: {
    /* ... */
  },
  allowWhere: {
    /* ... */
  },
  allowOrderBy: [
    /* ... */
  ],
  maxLimit: 100,
  defaultLimit: 20,
});
```

## allowSelect

Controls which fields clients can request. **Scalars are allowed by default, relations are denied by default.**

```ts
allowSelect: {
  password: false,              // deny this scalar field
  posts: { title: true },       // allow relation, restrict to title only
  orders: true,                 // allow relation, all fields
  secretNotes: false,           // deny relation
}
```

Rules:

- **Scalar/computed/derived** — allowed by default. Set `false` to deny.
- **Relations** — denied by default. Set `true` or an object to allow.

Without `allowSelect` config, all scalar fields are returned but no relations.

## allowWhere

Controls which fields clients can filter by. **All fields and operators allowed by default.**

```ts
allowWhere: {
  password: false,                          // deny filtering by this field
  email: { operators: ['eq', 'contains'] }, // restrict operators
  metadata: { operators: ['eq'] },          // restrict JSON filtering
}
```

Rules:

- **Without config** — all fields, all operators allowed
- **With config** — fields not mentioned are still allowed. `false` to deny. `{ operators: [...] }` to restrict.

## allowOrderBy

Array of allowed field names for sorting. Supports relation dot-notation, derived fields, and JSON paths.

```ts
allowOrderBy: ['name', 'createdAt', 'author.firstName', 'author.postsCount', 'metadata.role'],
```

Without `allowOrderBy` config, all fields are allowed for sorting.

## Pagination

```ts
{
  maxLimit: 100,     // maximum records per request (default: 100)
  defaultLimit: 20,  // default if client doesn't specify (default: 20)
}
```

Client requests are clamped: `Math.min(requestedLimit, maxLimit)`.
