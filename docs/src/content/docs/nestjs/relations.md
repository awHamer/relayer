---
title: 'NestJS: Relation Endpoints'
description: Dedicated REST endpoints for managing many-to-many and belongs-to relations.
---

Relayer generates dedicated endpoints for managing relations, giving you clean URLs in API logs and fine-grained permission control.

## Configuration

Enable relation endpoints in your controller config:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    list: true,
    create: true,
    update: true,
    delete: true,
    relations: {
      postCategories: true,  // enable all three operations
    },
  },
})
```

This generates three endpoints:

| Method | URL                                   | Action                    |
| ------ | ------------------------------------- | ------------------------- |
| POST   | `/posts/:id/relations/postCategories` | Add links (connect)       |
| DELETE | `/posts/:id/relations/postCategories` | Remove links (disconnect) |
| PUT    | `/posts/:id/relations/postCategories` | Replace all links (set)   |

Relation names autocomplete from your entity's Drizzle schema -- a typo will cause a TypeScript error.

### Selective operations

Disable specific operations per relation:

```ts
relations: {
  postCategories: {
    connect: true,
    disconnect: true,
    set: false,        // no PUT endpoint
  },
}
```

## Request format

All three endpoints accept the same body shape:

```json
{ "data": [1, 2, 3] }
```

### POST -- connect (add links)

```bash
curl -X POST /posts/1/relations/postCategories \
  -H 'Content-Type: application/json' \
  -d '{"data": [5, 6]}'

# Response: {"data": {"success": true}}
```

Adds new links without removing existing ones. Existing links are preserved.

### DELETE -- disconnect (remove links)

```bash
curl -X DELETE /posts/1/relations/postCategories \
  -H 'Content-Type: application/json' \
  -d '{"data": [5]}'

# Response: {"data": {"success": true}}
```

Removes only the specified links. Other links are preserved.

### PUT -- set (replace all)

```bash
curl -X PUT /posts/1/relations/postCategories \
  -H 'Content-Type: application/json' \
  -d '{"data": [7, 8]}'

# Response: {"data": {"success": true}}
```

Deletes all existing links for this entity and creates the ones you specify. The result is exactly the IDs you pass.

## Extra columns on join tables

When the join table has columns beyond the two foreign keys (like `isPrimary`, `role`, `sortOrder`), pass objects with `_id` instead of plain IDs:

```bash
curl -X POST /posts/1/relations/postCategories \
  -H 'Content-Type: application/json' \
  -d '{"data": [{"_id": 5, "isPrimary": true}, {"_id": 6, "isPrimary": false}]}'
```

`_id` is the target entity's primary key. Other fields are passed through to the join table insert.

`disconnect` always uses plain IDs -- extra columns are irrelevant for deletion.

## Inline via PATCH

You can also manage relations through the standard `PATCH /:id` endpoint by including relation operations in the request body:

```bash
# Relation-only
curl -X PATCH /posts/1 \
  -H 'Content-Type: application/json' \
  -d '{"postCategories": {"connect": [5, 6]}}'

# Mixed: scalar fields + relations in one request
curl -X PATCH /posts/1 \
  -H 'Content-Type: application/json' \
  -d '{"title": "Updated", "postCategories": {"connect": [5], "disconnect": [3]}}'
```

Relation keys are separated from scalar data before validation, so your Zod or class-validator schema does not need to account for them.

## Hooks

Use `beforeRelation` and `afterRelation` to add logic around relation operations:

```ts
import {
  RelayerHooks,
  type RelationId,
  type RelationKeys,
  type RelationOperation,
  type RequestContext,
} from '@relayerjs/nestjs-crud';

@Injectable()
export class PostHooks extends RelayerHooks<PostEntity, EM> {
  beforeRelation(
    operation: RelationOperation,
    relationName: RelationKeys<PostEntity, EM>,
    ids: RelationId[],
    ctx: RequestContext,
  ) {
    console.log(`${operation} on ${relationName}: [${ids}]`);
    // Return modified ids to override, or void to pass through
  }

  afterRelation(
    operation: RelationOperation,
    relationName: RelationKeys<PostEntity, EM>,
    ids: RelationId[],
    ctx: RequestContext,
  ) {
    console.log(`${operation} on ${relationName} completed`);
  }
}
```

Both hooks are optional. `beforeRelation` can return a modified `ids` array to transform the input before the operation executes.

Hooks fire for both dedicated endpoints and inline PATCH operations.

## Decorators

Relation routes participate in the decorator system. Use targeted decorators to add guards or interceptors:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    relations: { postCategories: true },
  },
  decorators: [
    UseGuards(AuthGuard),
    { apply: [Roles('admin')], for: ['relationConnect', 'relationDisconnect', 'relationSet'] },
  ],
})
```

The route names for targeting are `relationConnect`, `relationDisconnect`, and `relationSet`.

## Types

The following types are exported for use in custom hooks and overrides:

| Type                  | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `RelationKeys<E,EM>`  | Union of valid relation names for an entity                                 |
| `RelationOperation`   | `'connect' \| 'disconnect' \| 'set'`                                        |
| `RelationId`          | `string \| number \| ({ _id: string \| number } & Record<string, unknown>)` |
| `RelationRouteConfig` | Config object for enabling/disabling individual operations                  |
