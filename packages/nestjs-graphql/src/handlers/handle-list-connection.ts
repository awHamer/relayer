import { buildCursorWhere, decodeCursor, encodeCursor } from '@relayerjs/nestjs-common';

import { infoToRelayerSelect } from '../info/info-to-select';
import { selectionIncludes } from '../info/selection-includes';
import type { AnyHandlerHost, CursorListHandlerArgs, HandlerCallContext } from './handler-types';
import { buildOperationContext } from './handler-types';
import { translateOrderByInput, type FlatOrderBy } from './order-by-translation';

export interface ConnectionResult {
  edges: { node: unknown; cursor: string }[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number | null;
}

export async function handleListConnection(
  host: AnyHandlerHost,
  args: CursorListHandlerArgs,
  call: HandlerCallContext,
): Promise<ConnectionResult> {
  const { ctx, queryCtx } = buildOperationContext(host, call.gqlContext);
  const select = infoToRelayerSelect(call.info, call.entity, ['edges', 'node']);
  const orderBy = ensureIdOrder(translateOrderByInput(args.orderBy), call);

  const where = args.after
    ? mergeWhere(args.where, buildCursorWhere(decodeCursor(args.after)))
    : args.where;

  const limit = args.first ?? 20;

  const findOptions = {
    where,
    orderBy,
    limit: limit + 1,
    select,
    context: queryCtx,
  } as Parameters<ReturnType<AnyHandlerHost['getService']>['findMany']>[0];

  const hooks = host.getHooks();
  await hooks?.beforeFind?.(findOptions as never, ctx as never);

  const fetched = (await host.getService().findMany(findOptions)) as Record<string, unknown>[];
  const hasNextPage = fetched.length > limit;
  const items = hasNextPage ? fetched.slice(0, limit) : fetched;
  const finalItems =
    ((await hooks?.afterFind?.(items as never, ctx as never)) as Record<string, unknown>[]) ??
    items;

  const idField = call.entity.getPrimaryKeyField()?.name ?? 'id';
  const edges = finalItems.map((node) => ({
    node,
    cursor: encodeCursor(node, orderBy, idField),
  }));

  const totalCount = selectionIncludes(call.info, [], 'totalCount')
    ? await host.getService().count({ where: args.where, context: queryCtx } as never)
    : null;

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: Boolean(args.after),
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
    totalCount,
  };
}

function ensureIdOrder(orderBy: FlatOrderBy[], call: HandlerCallContext): FlatOrderBy[] {
  const idField = call.entity.getPrimaryKeyField()?.name ?? 'id';
  if (orderBy.some((o) => o.field === idField)) return orderBy;
  return [...orderBy, { field: idField, order: 'asc' }];
}

function mergeWhere(
  base: Record<string, unknown> | undefined,
  cursorWhere: Record<string, unknown>,
): Record<string, unknown> {
  if (!base) return cursorWhere;
  return { AND: [base, cursorWhere] };
}
