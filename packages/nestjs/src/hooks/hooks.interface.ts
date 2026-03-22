import type { RequestContext } from '../types';

export abstract class RelayerHooks<TEntity = unknown> {
  beforeCreate?(
    data: Record<string, unknown>,
    ctx: RequestContext,
  ): Promise<Record<string, unknown> | void> | Record<string, unknown> | void;
  afterCreate?(entity: TEntity, ctx: RequestContext): Promise<void> | void;
  beforeUpdate?(
    data: Record<string, unknown>,
    where: Record<string, unknown>,
    ctx: RequestContext,
  ): Promise<Record<string, unknown> | void> | Record<string, unknown> | void;
  afterUpdate?(entity: TEntity, ctx: RequestContext): Promise<void> | void;
  beforeDelete?(where: Record<string, unknown>, ctx: RequestContext): Promise<void> | void;
  afterDelete?(entity: TEntity, ctx: RequestContext): Promise<void> | void;
  beforeFind?(options: Record<string, unknown>, ctx: RequestContext): Promise<void> | void;
}
