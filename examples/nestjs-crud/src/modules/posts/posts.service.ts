import { Injectable } from '@nestjs/common';
import { InjectRelayer, RelayerService } from '@relayerjs/nestjs-crud';
import type { RelayerInstance, Where } from '@relayerjs/nestjs-crud';

import type { AppQueryContext } from '../../common/app-context';
import { PostEntity, type EM } from '../../entities';

@Injectable()
export class PostsService extends RelayerService<PostEntity, EM, AppQueryContext> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, PostEntity);
  }

  // filtering driven by typed query context
  protected getDefaultWhere(
    upstream?: Where<PostEntity, EM>,
    ctx?: AppQueryContext,
  ): Where<PostEntity, EM> | undefined {
    if (!ctx || ctx.isAdmin) return upstream;

    const scoped: Where<PostEntity, EM> = {
      OR: [{ published: true }, { authorId: ctx.currentUserId }],
    };
    return upstream ? { AND: [upstream, scoped] } : scoped;
  }

  async findPublished(ctx?: AppQueryContext) {
    return this.findMany({
      select: { id: true, title: true, published: true },
      where: { published: true },
      context: ctx,
    });
  }

  async customAggregate() {
    const result = await this.aggregate({
      where: { published: true },
      groupBy: ['author.fullName'],
      _count: true,
      _sum: {
        'author.postsCount': true,
      },
    });

    // how the types work here
    result.forEach((row) => {
      console.log(
        '[AggregateResult]',
        row.author.fullName,
        { count: row._count },
        row._sum.author.postsCount,
      );
    });

    return result;
  }

  async findWithAuthor() {
    return this.findMany({
      select: { id: true, title: true, author: { fullName: true } },
    });
  }

  async customCrossEntityQuery() {
    return this.r.users.findMany({
      select: { id: true, posts: { author: { id: true, postsCount: true } } },
      where: { email: { contains: '@example.com' } },
    });
  }

  async publish(id: number) {
    return this.update({ where: { id }, data: { published: true } });
  }
}
