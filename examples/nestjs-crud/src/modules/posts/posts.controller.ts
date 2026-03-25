import { Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CrudController, RelayerController } from '@relayerjs/nestjs-crud';

import { AuthGuard } from '../../common/auth.guard';
import { Roles } from '../../common/roles.decorator';
import { EM, PostEntity } from '../../entities';
import { PostDtoMapper } from './posts.dto-mapper';
import { PostHooks } from './posts.hooks';
import { createPostSchema, updatePostSchema } from './posts.schema';
import { PostsService } from './posts.service';

@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    list: {
      pagination: 'cursor_UNSTABLE',
      defaults: {
        select: {
          id: true,
          title: true,
          published: true,
          comments: { $limit: 5, id: true, content: true, author: { id: true, fullName: true } },
        },
        orderBy: { field: 'createdAt', order: 'desc' },
      },
      allow: {
        select: { title: false, comments: { $limit: 5 } },
        where: {
          title: {
            operators: ['contains', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
          },
          published: true,
          authorId: true,
        },
        orderBy: ['title', 'createdAt'],
      },
      maxLimit: 50,
      defaultLimit: 20,
      search: (q) => ({
        OR: [{ title: { ilike: `%${q}%` } }, { content: { ilike: `%${q}%` } }],
      }),
    },
    findById: {
      defaults: {
        select: {
          id: true,
          title: true,
          content: true,
          published: true,
          tags: true,
          authorId: true,
          createdAt: true,
          comments: { id: true, content: true, author: { id: true, fullName: true } },
        },
      },
    },
    create: {
      schema: createPostSchema,
    },
    update: {
      schema: updatePostSchema,
    },
    delete: true,
    count: true,
    aggregate: true,
  },
  decorators: [
    UseGuards(AuthGuard),
    { apply: [Roles('admin')], for: ['create', 'update', 'delete'] },
  ],
  dtoMapper: PostDtoMapper,
  hooks: PostHooks,
})
export class PostsController extends RelayerController<PostEntity, EM, PostDtoMapper> {
  constructor(private readonly postsService: PostsService) {
    super(postsService);
  }

  // Override example — just override the parent methods: handleFindById, handleList etc
  /*async handleFindById(id: string, request: Request) {
    const item = await this.postsService.findFirst({
      select: { id: true, title: true,  author: { id: true, fullName: true, postsCount: true } },
      where: { id: parseInt(id, 10) },
    });
    return { msg: 'Overridden findById handler', id, item, headers: request.headers };
  }*/

  @Get('custom-aggregation')
  customAggregation() {
    return this.postsService.customAggregate();
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
