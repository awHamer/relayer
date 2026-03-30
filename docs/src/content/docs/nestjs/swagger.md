---
title: 'NestJS: Swagger / OpenAPI'
description: Auto-generated API documentation for every route -- zero config required.
---

Every route that `@CrudController` generates comes with OpenAPI metadata out of the box. Install `@nestjs/swagger`, wire up `SwaggerModule`, and your entire API is documented -- summaries, query parameters with examples, request bodies, response codes.

## Setup

Install the NestJS Swagger package:

```bash
npm install @nestjs/swagger
```

Add `SwaggerModule` to your bootstrap:

```ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder().setTitle('My API').setVersion('1.0').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
```

Open `http://localhost:3000/api` -- every CRUD route is documented.

That's it. Relayer sets OpenAPI metadata programmatically when routes are generated. All routes are grouped under a tag named after your entity path (e.g., `posts`).

## Request body schemas

Swagger needs to know the shape of your create/update request body. Two approaches:

### Option A: Class DTOs with `@ApiProperty`

Full control over what Swagger displays -- examples, descriptions, required fields:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'Hello World', description: 'Post title' })
  title!: string;

  @ApiProperty({ example: 'My first post', description: 'Post content' })
  content!: string;

  @ApiPropertyOptional({ example: false })
  published?: boolean;

  @ApiPropertyOptional({ example: ['typescript'], type: [String] })
  tags?: string[];
}
```

Pass the class as `schema` in route config:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    create: { schema: CreatePostDto },
    update: { schema: UpdatePostDto },
  },
})
```

Swagger renders the full schema with examples and "Try it out" pre-filled values.

### Using Zod schemas with Swagger

If you use Zod for validation and want Swagger body docs, convert your Zod schema to a class DTO using [nestjs-zod](https://github.com/risen228/nestjs-zod):

```bash
npm install nestjs-zod
```

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  published: z.boolean().optional(),
});

export class CreatePostDto extends createZodDto(createPostSchema) {}
```

Pass the DTO class as `schema` -- Relayer uses it for both validation and Swagger:

```ts
routes: {
  create: { schema: CreatePostDto },
}
```

## Customizing summaries

Override the auto-generated summary or description for any route:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  swagger: {
    tag: 'Blog Posts',
    list: { summary: 'Search blog posts', description: 'Full-text search with filters' },
    create: { summary: 'Publish a new post' },
    findById: { description: 'Returns the post with all comments and author info' },
  },
})
```

### Available overrides

| Field       | Default                     | What it controls     |
| ----------- | --------------------------- | -------------------- |
| `tag`       | Entity path (e.g., `posts`) | Swagger tag grouping |
| `list`      | `List {entity}`             | GET /                |
| `findById`  | `Get {entity} by ID`        | GET /:id             |
| `create`    | `Create {entity}`           | POST /               |
| `update`    | `Update {entity}`           | PATCH /:id           |
| `delete`    | `Delete {entity}`           | DELETE /:id          |
| `count`     | `Count {entity}`            | GET /count           |
| `aggregate` | `Aggregate {entity}`        | GET /aggregate       |

Each accepts `{ summary?, description? }`.

## Disabling Swagger

If you don't want Swagger metadata on a specific controller:

```ts
@CrudController<PostEntity, EM>({
  model: PostEntity,
  swagger: false,
})
```

No metadata is set, `@nestjs/swagger` sees nothing. Useful for internal controllers that shouldn't appear in the docs.

## Custom routes

Routes you add manually (outside of `@CrudController` auto-generation) need standard NestJS Swagger decorators:

```ts
@Get('published')
@ApiOperation({ summary: 'Get published posts' })
@ApiResponse({ status: 200, description: 'Published posts' })
async published() {
  return { data: await this.postsService.findPublished() };
}

@Post(':id/publish')
@ApiOperation({ summary: 'Publish a post' })
@ApiParam({ name: 'id', type: 'number' })
@ApiResponse({ status: 200, description: 'Post published' })
async publish(@Param('id', ParseIntPipe) id: number) {
  return { data: await this.postsService.publish(id) };
}
```

These appear alongside auto-generated routes in Swagger UI under the same tag.

## How it works

Relayer doesn't depend on `@nestjs/swagger`. Instead, it writes the same metadata keys that Swagger reads (`swagger/apiOperation`, `swagger/apiResponse`, `swagger/apiParameters`, `swagger/apiUseTags`) directly via `Reflect.defineMetadata`.

This means:

- **Zero overhead** if `@nestjs/swagger` isn't installed -- metadata is just ignored
- **No peer dependency** -- Relayer works the same with or without Swagger
- **Compatible with any Swagger version** that reads standard NestJS metadata
