import { GqlResolver, RelayerResolver } from '@relayerjs/nestjs-graphql';

import type { AppContext, AppQueryContext } from '../../common/app-context';
import { PostEntity, type EM } from '../../entities';
import { PostHooks } from './posts.hooks';
import { PostsService } from './posts.service';

interface ExpressLikeRequest {
  headers?: Record<string, string | string[] | undefined>;
}

@GqlResolver(PostEntity, {
  name: 'Post',
  hooks: PostHooks,
  queries: {
    list: { name: 'posts', pagination: 'both' },
    findById: { name: 'post' },
    count: { name: 'postsCount' },
    aggregate: { name: 'postsAggregate' },
  },
  mutations: {
    createOne: { name: 'createPost' },
    updateOne: { name: 'updatePost' },
    deleteOne: { name: 'deletePost' },
  },
  filterable: ['id', 'title', 'published', 'author'],
  orderable: ['id', 'title', 'createdAt'],
})
export class PostsResolver extends RelayerResolver<PostEntity, EM, AppContext, AppQueryContext> {
  constructor(postsService: PostsService) {
    super(postsService);
  }

  protected buildContext(req: unknown): AppContext {
    const request = req as ExpressLikeRequest;
    const userId = Number(request?.headers?.['x-user-id'] ?? '0');
    const role = (request?.headers?.['x-user-role'] ?? 'user') as 'admin' | 'user';
    return {
      request,
      currentUser: { id: userId, role },
    };
  }

  protected buildQueryContext(ctx: AppContext): AppQueryContext {
    return {
      currentUserId: ctx.currentUser.id,
      isAdmin: ctx.currentUser.role === 'admin',
    };
  }
}
