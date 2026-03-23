---
title: 'NestJS: Decorators & Guards'
description: Apply guards, interceptors, and decorators to CRUD routes.
---

## Decorator targeting

Apply decorators to all routes or specific ones:

```ts
@CrudController({
  model: PostEntity,
  decorators: [
    // Bare decorator = all routes
    UseGuards(AuthGuard),

    // Targeted = specific routes only
    { apply: [Roles('admin')], for: ['create', 'update', 'delete'] },
    { apply: [CacheInterceptor], for: ['list', 'findById'] },
  ],
})
```

Route names: `'list'`, `'findById'`, `'create'`, `'update'`, `'delete'`, `'count'`.

## Overriding routes

Override a CRUD method while keeping the others auto-generated:

```ts
@CrudController({ model: PostEntity, routes: { list: true, create: true } })
export class PostsController extends RelayerController<PostEntity> {
  constructor(service: PostsService) {
    super(service);
  }

  // Method name matches route name -> no argument needed
  @Override()
  async list(@ListQuery() query: ParsedListQuery) {
    const [data, total] = await Promise.all([
      this.service.findMany(query),
      this.service.count({ where: query.where }),
    ]);
    return { data, meta: { total } };
  }

  // Custom method name -> pass route name as argument
  @Override('create')
  async createWithAuthor(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.service.create({ ...body, authorId: req.user.id });
  }
}
```

`this.base` gives access to original CRUD methods from overrides:

```ts
@Override('findById')
async findByIdWithLog(@Param('id') id: string) {
  console.log('Finding:', id);
  return this.base.findById(id);
}
```

## Custom routes

Add non-CRUD routes alongside auto-generated ones:

```ts
@CrudController({ model: PostEntity })
export class PostsController extends RelayerController<PostEntity> {
  constructor(private readonly postsService: PostsService) {
    super(postsService);
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard)
  async publish(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.postsService.publish(id) };
  }

  @Get('published')
  async published() {
    return { data: await this.postsService.findPublished() };
  }
}
```
