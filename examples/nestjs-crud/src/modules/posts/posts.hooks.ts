import { Injectable, Logger } from '@nestjs/common';
import {
  RelayerHooks,
  type AggregateOptions,
  type FirstOptions,
  type RelationId,
  type RelationKeys,
  type RelationOperation,
} from '@relayerjs/nestjs-crud';

import type { AppContext } from '../../common/app-context';
import { PostEntity, type EM } from '../../entities';

@Injectable()
export class PostHooks extends RelayerHooks<PostEntity, EM, AppContext> {
  private readonly logger = new Logger(PostHooks.name);

  async afterFind(entities: PostEntity[], ctx: AppContext): Promise<void> {
    this.logger.log(`Found ${entities.length} posts (user ${ctx.currentUser.id})`);
  }

  async beforeFindOne(options: FirstOptions<PostEntity, EM>, ctx: AppContext): Promise<void> {
    this.logger.log(
      `Finding post with options: ${JSON.stringify(options)} (user ${ctx.currentUser.id})`,
    );
  }

  async afterCreate(entity: PostEntity, ctx: AppContext): Promise<void> {
    this.logger.log(`Post created: ${entity.id} - ${entity.title} by user ${ctx.currentUser.id}`);
  }

  async afterUpdate(entity: PostEntity, ctx: AppContext): Promise<void> {
    this.logger.log(`Post updated: ${entity.id} by user ${ctx.currentUser.id}`);
  }

  async afterDelete(entity: PostEntity, ctx: AppContext): Promise<void> {
    this.logger.log(`Post deleted: ${entity.id} by user ${ctx.currentUser.id}`);
  }

  async beforeAggregate(options: AggregateOptions<PostEntity, EM>): Promise<void> {
    this.logger.log(`Aggregating posts: ${JSON.stringify(options)}`);
  }

  afterAggregate(result: unknown) {
    this.logger.log(`Aggregated posts: ${JSON.stringify(result)}`);
  }

  beforeRelation(
    operation: RelationOperation,
    relationName: RelationKeys<PostEntity, EM>,
    ids: RelationId[],
    ctx: AppContext,
  ) {
    this.logger.log(
      `Relation ${operation} on ${relationName}: [${ids.join(', ')}] (user ${ctx.currentUser.id})`,
    );
  }

  afterRelation(
    operation: RelationOperation,
    relationName: RelationKeys<PostEntity, EM>,
    ids: RelationId[],
    ctx: AppContext,
  ) {
    this.logger.log(
      `Relation ${operation} on ${relationName} completed: [${ids.join(', ')}] (user ${ctx.currentUser.id})`,
    );
  }
}
