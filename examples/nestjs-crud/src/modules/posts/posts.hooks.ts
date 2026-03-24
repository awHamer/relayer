import { Injectable, Logger } from '@nestjs/common';
import { RelayerHooks, type RequestContext } from '@relayerjs/nestjs-crud';

import type { PostEntity } from '../../entities';

@Injectable()
export class PostHooks extends RelayerHooks<PostEntity> {
  private readonly logger = new Logger(PostHooks.name);

  async afterFind(entities: PostEntity[]): Promise<void> {
    this.logger.log(`Found ${entities.length} posts`);
  }

  async beforeFindOne(options: Record<string, unknown>): Promise<void> {
    this.logger.log(`Finding post with options: ${JSON.stringify(options)}`);
  }

  async afterCreate(entity: PostEntity): Promise<void> {
    this.logger.log(`Post created: ${entity.id} - ${entity.title}`);
  }

  async afterUpdate(entity: PostEntity): Promise<void> {
    this.logger.log(`Post updated: ${entity.id}`);
  }

  async afterDelete(entity: PostEntity): Promise<void> {
    this.logger.log(`Post deleted: ${entity.id}`);
  }

  async beforeAggregate(options: Record<string, unknown>): Promise<void> {
    this.logger.log(`Aggregating posts: ${JSON.stringify(options)}`);
  }

  afterAggregate(result: unknown) {
    this.logger.log(`Aggregated posts: ${JSON.stringify(result)}`);
  }
}
