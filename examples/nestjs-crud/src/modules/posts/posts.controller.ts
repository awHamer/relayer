import { Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CrudController, RelayerController } from '@relayerjs/nestjs-crud';

import { AuthGuard } from '../../common/auth.guard';
import { Roles } from '../../common/roles.decorator';
import { EM, PostEntity } from '../../entities';
import { CreatePostDto, UpdatePostDto } from './posts.dto';
import { PostDtoMapper } from './posts.dto-mapper';
import { PostHooks } from './posts.hooks';
import { PostsService } from './posts.service';

@CrudController<PostEntity, EM>({
  model: PostEntity,
  routes: {
    list: {
      pagination: 'cursor',
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
          title: { operators: ['contains', 'startsWith', 'endsWith', 'isNull', 'isNotNull'] },
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
      // class-validator
      schema: CreatePostDto,
    },
    update: {
      // zod + nest-zod
      schema: UpdatePostDto,
    },
    delete: true,
    count: true,
    aggregate: true,
    relations: {
      postCategories: true,
    },
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

  @Get('custom-aggregation')
  @ApiOperation({ summary: 'Custom aggregation', description: 'Custom posts aggregation query' })
  @ApiResponse({ status: 200, description: 'Aggregation result' })
  customAggregation() {
    return this.postsService.customAggregate();
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Publish post', description: 'Set post as published' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Published post' })
  async publish(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.postsService.publish(id) };
  }

  @Get('published')
  @ApiOperation({ summary: 'Get published posts' })
  @ApiResponse({ status: 200, description: 'Published posts list' })
  async published() {
    return { data: await this.postsService.findPublished() };
  }
}
