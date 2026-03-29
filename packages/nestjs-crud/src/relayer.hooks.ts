import type { RelationId, RelationKeys, RelationOperation, RequestContext } from './types';
import type {
  AggregateOptions,
  FirstOptions,
  ManyOptions,
  Where,
  WhereOptions,
} from './types/entity-repo';

/**
 * Lifecycle hooks for CRUD and relation operations.
 *
 * Extend this class and override any method to add side effects -- notifications,
 * audit logging, cache invalidation, data enrichment.
 * All methods are optional, support sync and async.
 *
 * Register via `@CrudController({ hooks: YourHooks })` and add to module providers.
 *
 * @typeParam TEntity - The entity class
 * @typeParam TEntities - Entity map for relation-aware types
 */
export abstract class RelayerHooks<
  TEntity = unknown,
  TEntities extends Record<string, unknown> = Record<string, never>,
> {
  /**
   * Runs before creating an entity.
   * Return modified data to override the input, or void to pass through.
   */
  beforeCreate?(
    data: Partial<TEntity>,
    ctx: RequestContext,
  ): Promise<Partial<TEntity> | void> | Partial<TEntity> | void;

  /** Runs after an entity is created. Use for notifications, cache invalidation, etc. */
  afterCreate?(entity: TEntity, ctx: RequestContext): Promise<void> | void;

  /**
   * Runs before updating an entity.
   * Receives the update data and where clause. Return modified data to override.
   */
  beforeUpdate?(
    data: Partial<TEntity>,
    where: Where<TEntity, TEntities>,
    ctx: RequestContext,
  ): Promise<Partial<TEntity> | void> | Partial<TEntity> | void;

  /** Runs after an entity is updated. */
  afterUpdate?(entity: TEntity, ctx: RequestContext): Promise<void> | void;

  /** Runs before deleting an entity. Receives the where clause. */
  beforeDelete?(where: Where<TEntity, TEntities>, ctx: RequestContext): Promise<void> | void;

  /** Runs after an entity is deleted. */
  afterDelete?(entity: TEntity, ctx: RequestContext): Promise<void> | void;

  /** Runs before a findMany query. Receives the full query options. */
  beforeFind?(options: ManyOptions<TEntity, TEntities>, ctx: RequestContext): Promise<void> | void;

  /**
   * Runs after findMany returns results.
   * Return a modified array to transform the output, or void to pass through.
   */
  afterFind?(
    entities: TEntity[],
    ctx: RequestContext,
  ): Promise<TEntity[] | void> | TEntity[] | void;

  /** Runs before a findFirst query. */
  beforeFindOne?(
    options: FirstOptions<TEntity, TEntities>,
    ctx: RequestContext,
  ): Promise<void> | void;

  /**
   * Runs after findFirst returns a result.
   * Return a modified entity to transform the output.
   */
  afterFindOne?(entity: TEntity, ctx: RequestContext): Promise<TEntity | void> | TEntity | void;

  /** Runs before a count query. */
  beforeCount?(
    options: WhereOptions<TEntity, TEntities>,
    ctx: RequestContext,
  ): Promise<void> | void;

  /** Runs before an aggregate query. */
  beforeAggregate?(
    options: AggregateOptions<TEntity, TEntities>,
    ctx: RequestContext,
  ): Promise<void> | void;

  /**
   * Runs after an aggregate query.
   * Return a modified result to transform the output.
   */
  afterAggregate?(result: unknown, ctx: RequestContext): Promise<unknown | void> | unknown | void;

  /**
   * Runs before a relation connect/disconnect/set operation.
   *
   * Fires for both dedicated endpoints (POST/DELETE/PUT /:id/relations/:name)
   * and inline PATCH with relation ops.
   *
   * Return a modified ids array to override, or void to pass through.
   */
  beforeRelation?(
    operation: RelationOperation,
    relationName: RelationKeys<TEntity, TEntities>,
    ids: RelationId[],
    ctx: RequestContext,
  ): Promise<RelationId[] | void> | RelationId[] | void;

  /**
   * Runs after a relation connect/disconnect/set operation completes.
   *
   * Use for audit logging, cache invalidation, event emission.
   */
  afterRelation?(
    operation: RelationOperation,
    relationName: RelationKeys<TEntity, TEntities>,
    ids: RelationId[],
    ctx: RequestContext,
  ): Promise<void> | void;
}
