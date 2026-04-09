import type { GraphQLResolveInfo } from 'graphql';
import type { RelayerHooks, RelayerService } from '@relayerjs/nestjs-crud';

import type { EntityMetadata } from '../metadata/entity-metadata';
import type { GqlContext } from '../types';

export interface HandlerHost<
  TEntity,
  EM extends Record<string, unknown>,
  TCtx extends GqlContext,
  TQueryCtx,
> {
  getService(): RelayerService<TEntity, EM, TQueryCtx>;
  getHooks(): RelayerHooks<TEntity, EM> | null;
  buildContext(req: unknown): TCtx;
  buildQueryContext(ctx: TCtx): TQueryCtx | undefined;
}

export interface OperationContext<TCtx extends GqlContext, TQueryCtx> {
  ctx: TCtx;
  queryCtx: TQueryCtx | undefined;
}

export function buildOperationContext<TCtx extends GqlContext, TQueryCtx>(
  host: { buildContext(req: unknown): TCtx; buildQueryContext(ctx: TCtx): TQueryCtx | undefined },
  gqlCtx: { req?: unknown; request?: unknown },
): OperationContext<TCtx, TQueryCtx> {
  const req = gqlCtx?.req ?? gqlCtx?.request ?? gqlCtx;
  const ctx = host.buildContext(req);
  const queryCtx = host.buildQueryContext(ctx);
  return { ctx, queryCtx };
}

export interface ListHandlerArgs {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>[] | Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface CursorListHandlerArgs {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>[] | Record<string, unknown>;
  first?: number;
  after?: string;
}

export type AnyHandlerHost = HandlerHost<unknown, Record<string, unknown>, GqlContext, unknown>;

export interface HandlerCallContext {
  info: GraphQLResolveInfo;
  gqlContext: { req?: unknown; request?: unknown };
  entity: EntityMetadata;
}
