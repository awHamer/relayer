import type { RequestContext } from './types';

export abstract class DtoMapper<
  TEntity = unknown,
  TListItem = TEntity,
  TSingleItem = TListItem,
  TInput = Partial<TEntity>,
> {
  abstract toListItem(entity: TEntity, ctx: RequestContext): Promise<TListItem> | TListItem;

  abstract toSingleItem(entity: TEntity, ctx: RequestContext): Promise<TSingleItem> | TSingleItem;

  toCreateInput?(input: TInput, ctx: RequestContext): Promise<Partial<TEntity>> | Partial<TEntity>;

  toUpdateInput?(input: TInput, ctx: RequestContext): Promise<Partial<TEntity>> | Partial<TEntity>;
}
