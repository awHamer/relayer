import { Injectable, Logger } from '@nestjs/common';
import { RelayerHooks } from '@relayerjs/nestjs-crud';

import type { PostEntity } from '../../entities';

@Injectable()
export class PostHooks extends RelayerHooks<PostEntity> {
  private readonly logger = new Logger(PostHooks.name);

  async afterCreate(entity: PostEntity): Promise<void> {
    this.logger.log(`Post created: ${entity.id} - ${entity.title}`);
  }

  async afterUpdate(entity: PostEntity): Promise<void> {
    this.logger.log(`Post updated: ${entity.id}`);
  }

  async afterDelete(entity: PostEntity): Promise<void> {
    this.logger.log(`Post deleted: ${entity.id}`);
  }
}
