import { Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CrudController, RelayerController, SelectConfig } from '@relayerjs/nestjs-crud';

import { AuthGuard } from '../../common/auth.guard';
import { Roles } from '../../common/roles.decorator';
import { PostEntity } from '../../entities';
import { PostDtoMapper } from './posts.dto-mapper';
import { PostHooks } from './posts.hooks';
import { createPostSchema, updatePostSchema } from './posts.schema';
import { PostsService } from './posts.service';

@CrudController({
  model: PostEntity,
  routes: {
    list: {
      pagination: 'offset',
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
  },
  decorators: [
    UseGuards(AuthGuard),
    { apply: [Roles('admin')], for: ['create', 'update', 'delete'] },
  ],
  dtoMapper: PostDtoMapper,
  hooks: PostHooks,
})
export class PostsController extends RelayerController<PostEntity, PostDtoMapper> {
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
