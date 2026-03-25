import type { RequestContext } from './types';
import type {
  AggregateOptions,
  FirstOptions,
  ManyOptions,
  Where,
  WhereOptions,
} from './types/entity-repo';

export abstract class RelayerHooks<
  TEntity = unknown,
  TEntities extends Record<string, unknown> = Record<string, never>,
> {
  beforeCreate?(
    data: Partial<TEntity>,
    ctx: RequestContext,
  ): Promise<Partial<TEntity> | void> | Partial<TEntity> | void;

  afterCreate?(entity: TEntity, ctx: RequestContext): Promise<void> | void;

  beforeUpdate?(
    data: Partial<TEntity>,
    where: Where<TEntity, TEntities>,
    ctx: RequestContext,
  ): Promise<Partial<TEntity> | void> | Partial<TEntity> | void;

  afterUpdate?(entity: TEntity, ctx: RequestContext): Promise<void> | void;

  beforeDelete?(where: Where<TEntity, TEntities>, ctx: RequestContext): Promise<void> | void;

  afterDelete?(entity: TEntity, ctx: RequestContext): Promise<void> | void;

  beforeFind?(options: ManyOptions<TEntity, TEntities>, ctx: RequestContext): Promise<void> | void;

  afterFind?(
    entities: TEntity[],
    ctx: RequestContext,
  ): Promise<TEntity[] | void> | TEntity[] | void;

  beforeFindOne?(
    options: FirstOptions<TEntity, TEntities>,
    ctx: RequestContext,
  ): Promise<void> | void;

  afterFindOne?(entity: TEntity, ctx: RequestContext): Promise<TEntity | void> | TEntity | void;

  beforeCount?(
    options: WhereOptions<TEntity, TEntities>,
    ctx: RequestContext,
  ): Promise<void> | void;

  beforeAggregate?(
    options: AggregateOptions<TEntity, TEntities>,
    ctx: RequestContext,
  ): Promise<void> | void;

  afterAggregate?(result: unknown, ctx: RequestContext): Promise<unknown | void> | unknown | void;
}
