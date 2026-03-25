import { Injectable } from '@nestjs/common';
import { InjectRelayer, RelayerService } from '@relayerjs/nestjs-crud';
import type { RelayerInstance } from '@relayerjs/nestjs-crud';

import { PostEntity, type EM } from '../../entities';

@Injectable()
export class PostsService extends RelayerService<PostEntity, EM> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, PostEntity);
  }

  async findPublished() {
    return this.findMany({
      select: { id: true, title: true, published: true },
      where: { published: true },
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
