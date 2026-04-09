import type { RequestContext } from './types';

/**
 * Abstract DTO mapper for transforming entities in API responses and inputs.
 *
 * Extend this class to control how entities are serialized for list and detail endpoints,
 * and how create/update input is enriched before reaching the service layer.
 *
 * Register via `@CrudController({ dtoMapper: YourMapper })` and add to module providers.
 *
 * @typeParam TEntity - The source entity type
 * @typeParam TListItem - Shape returned by list endpoints (defaults to TEntity)
 * @typeParam TSingleItem - Shape returned by findById/create/update endpoints (defaults to TListItem)
 * @typeParam TInput - Shape of create/update input (defaults to Partial<TEntity>)
 */
export abstract class DtoMapper<
  TEntity = unknown,
  TListItem = TEntity,
  TSingleItem = TListItem,
  TInput = Partial<TEntity>,
> {
  /**
   * Transform an entity for list responses (GET /).
   * Called once per item in the result array.
   */
  abstract toListItem(entity: TEntity, ctx: RequestContext): Promise<TListItem> | TListItem;

  /**
   * Transform an entity for single-item responses (GET /:id, POST /, PATCH /:id).
   * Use for detailed views that include more fields than the list.
   */
  abstract toSingleItem(entity: TEntity, ctx: RequestContext): Promise<TSingleItem> | TSingleItem;

  /**
   * Enrich create input before it reaches the service layer.
   * Use to inject defaults like `authorId` from the request context.
   * Optional -- if not defined, input passes through unchanged.
   */
  toCreateInput?(input: TInput, ctx: RequestContext): Promise<Partial<TEntity>> | Partial<TEntity>;

  /**
   * Enrich update input before it reaches the service layer.
   * Optional -- if not defined, input passes through unchanged.
   */
  toUpdateInput?(input: TInput, ctx: RequestContext): Promise<Partial<TEntity>> | Partial<TEntity>;
}
