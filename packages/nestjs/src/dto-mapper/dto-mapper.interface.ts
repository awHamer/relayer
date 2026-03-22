import type { RequestContext } from '../types';

export abstract class DtoMapper<
  TEntity = unknown,
  TListResponse = TEntity,
  TDetailResponse = TListResponse,
> {
  abstract toListItem(entity: TEntity, ctx: RequestContext): Promise<TListResponse> | TListResponse;
  abstract toResponse(
    entity: TEntity,
    ctx: RequestContext,
  ): Promise<TDetailResponse> | TDetailResponse;
  toCreateInput?(
    input: unknown,
    ctx: RequestContext,
  ): Promise<Record<string, unknown>> | Record<string, unknown>;
  toUpdateInput?(
    input: unknown,
    ctx: RequestContext,
  ): Promise<Record<string, unknown>> | Record<string, unknown>;
}
