import { Injectable, Logger } from '@nestjs/common';
import { RelayerHooks } from '@relayerjs/nestjs-common';

import type { AppContext } from '../../common/app-context';
import { PostEntity, type EM } from '../../entities';

@Injectable()
export class PostHooks extends RelayerHooks<PostEntity, EM, AppContext> {
  private readonly logger = new Logger(PostHooks.name);

  afterFind(entities: PostEntity[], ctx: AppContext): void {
    this.logger.log(`Found ${entities.length} posts (user ${ctx.currentUser?.id ?? 'anon'})`);
  }

  afterCreate(entity: PostEntity, ctx: AppContext): void {
    this.logger.log(
      `Post created: ${entity.id} - ${entity.title} by ${ctx.currentUser?.id ?? 'anon'}`,
    );
  }

  afterUpdate(entity: PostEntity, ctx: AppContext): void {
    this.logger.log(`Post updated: ${entity.id} by ${ctx.currentUser?.id ?? 'anon'}`);
  }

  afterDelete(entity: PostEntity, ctx: AppContext): void {
    this.logger.log(`Post deleted: ${entity.id} by ${ctx.currentUser?.id ?? 'anon'}`);
  }
}
