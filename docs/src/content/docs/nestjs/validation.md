---
title: 'NestJS: Validation'
description: Validate request bodies with Zod schemas or class-validator DTOs.
---

## Zod schemas

Define schemas and attach to routes:

```ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  published: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
});

export const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
});
```

```ts
@CrudController({
  model: PostEntity,
  routes: {
    create: { schema: createPostSchema },
    update: { schema: updatePostSchema },
  },
})
```

## class-validator DTOs

Install class-validator and class-transformer:

```bash
npm install class-validator class-transformer
```

Define DTOs:

```ts
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
```

```ts
@CrudController({
  model: PostEntity,
  routes: {
    create: { schema: CreatePostDto },
  },
})
```

## Unified error format

Both Zod and class-validator produce the same error format:

```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "errors": [
    { "code": "invalid_type", "message": "Required", "path": ["title"] },
    { "code": "invalid_type", "message": "Expected number", "path": ["authorId"] }
  ]
}
```

## Validation pipeline

Order of processing for create/update:

1. **Validate** body against schema (Zod or class-validator)
2. **DtoMapper** `toCreateInput` / `toUpdateInput` (if configured)
3. **Hooks** `beforeCreate` / `beforeUpdate`
4. **Service** `create` / `update`
