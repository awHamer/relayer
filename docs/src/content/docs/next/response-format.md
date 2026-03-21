---
title: Response Format
description: Consistent JSON response envelope for all endpoints.
---

## Default format

All responses follow the same envelope:

### Success

```json
{
  "data": { ... }
}
```

List responses include metadata:

```json
{
  "data": [{ "id": 1, "name": "John" }],
  "meta": { "total": 42, "limit": 20, "offset": 0 }
}
```

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field \"password\" is not allowed in where",
    "status": 422
  }
}
```

## Status codes

| Operation | Success | Not Found | Validation Error |
| --------- | ------- | --------- | ---------------- |
| list      | 200     | —         | 422              |
| findById  | 200     | 404       | 422              |
| create    | 201     | —         | 422              |
| update    | 200     | 404       | 422              |
| remove    | 200     | 404       | 422              |
| count     | 200     | —         | 422              |
| aggregate | 200     | —         | 422              |

## Error codes

| Code               | Status | When                                        |
| ------------------ | ------ | ------------------------------------------- |
| `VALIDATION_ERROR` | 422    | Invalid where, orderBy, select, or body     |
| `NOT_FOUND`        | 404    | Record not found (findById, update, remove) |
| `BAD_REQUEST`      | 400    | Malformed request                           |
| `INTERNAL_ERROR`   | 500    | Unexpected server error                     |

## Envelope helpers

For custom endpoints, use the helper functions directly:

```ts
import { envelope, errorEnvelope } from '@relayerjs/next';

export async function GET(req: Request) {
  const users = await r.users.findMany();
  return envelope(undefined, users, { total: users.length });
}

export async function POST(req: Request) {
  if (!isValid) {
    return errorEnvelope(undefined, {
      code: 'VALIDATION_ERROR',
      message: 'Name is required',
      status: 422,
    });
  }
}
```
