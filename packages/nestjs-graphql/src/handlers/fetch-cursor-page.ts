import { mergeWhere } from '@relayerjs/core';
import { buildCursorWhere, decodeCursor } from '@relayerjs/nestjs-common';

import { infoToRelayerSelect, selectionIncludes } from '../info';
import type { AnyHandlerHost, CursorListHandlerArgs, HandlerCallContext } from './handler-types';
import { buildOperationContext } from './handler-types';
import { translateOrderByInput, type FlatOrderBy } from './order-by-translation';

export interface CursorPage {
  items: Record<string, unknown>[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  orderBy: FlatOrderBy[];
  idField: string;
  totalCount: number | null;
}

export async function fetchCursorPage(
  host: AnyHandlerHost,
  args: CursorListHandlerArgs,
  call: HandlerCallContext,
  selectRootPath: string[],
): Promise<CursorPage> {
  const { ctx, queryCtx } = buildOperationContext(host, call.gqlContext);
  const select = infoToRelayerSelect(call.info, call.entity, selectRootPath);
  const idField = call.entity.getPrimaryKeyField()?.name ?? 'id';
  const orderBy = ensureIdOrder(translateOrderByInput(args.orderBy), idField);

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
  await hooks?.beforeFind?.(findOptions!, ctx);

  const fetched = (await host.getService().findMany(findOptions)) as Record<string, unknown>[];
  const hasNextPage = fetched.length > limit;
  const sliced = hasNextPage ? fetched.slice(0, limit) : fetched;
  const items = ((await hooks?.afterFind?.(sliced, ctx)) as Record<string, unknown>[]) ?? sliced;

  const totalCount = selectionIncludes(call.info, [], 'totalCount')
    ? await host.getService().count({ where: args.where, context: queryCtx })
    : null;

  return {
    items,
    hasNextPage,
    hasPreviousPage: Boolean(args.after),
    orderBy,
    idField,
    totalCount,
  };
}

function ensureIdOrder(orderBy: FlatOrderBy[], idField: string): FlatOrderBy[] {
  if (orderBy.some((o) => o.field === idField)) return orderBy;
  return [...orderBy, { field: idField, order: 'asc' }];
}
