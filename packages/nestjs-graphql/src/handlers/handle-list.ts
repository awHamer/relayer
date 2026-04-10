import { infoToRelayerSelect } from '../info/info-to-select';
import { selectionIncludes } from '../info/selection-includes';
import type { AnyHandlerHost, HandlerCallContext, ListHandlerArgs } from './handler-types';
import { buildOperationContext } from './handler-types';
import { translateOrderByInput } from './order-by-translation';

export interface ListResult {
  items: unknown[];
  totalCount: number;
  hasMore: boolean;
}

export async function handleList(
  host: AnyHandlerHost,
  args: ListHandlerArgs,
  call: HandlerCallContext,
): Promise<ListResult> {
  const { ctx, queryCtx } = buildOperationContext(host, call.gqlContext);
  const select = infoToRelayerSelect(call.info, call.entity, ['items']);
  const orderBy = translateOrderByInput(args.orderBy);

  const findOptions = {
    where: args.where,
    orderBy: orderBy.length > 0 ? orderBy : undefined,
    limit: args.limit,
    offset: args.offset,
    select,
    context: queryCtx,
  } as Parameters<ReturnType<AnyHandlerHost['getService']>['findMany']>[0];

  const hooks = host.getHooks();
  await hooks?.beforeFind?.(findOptions as never, ctx as never);

  const items = (await host.getService().findMany(findOptions)) as unknown[];
  const finalItems =
    ((await hooks?.afterFind?.(items as never, ctx as never)) as unknown[]) ?? items;

  let totalCount = 0;
  if (selectionIncludes(call.info, [], 'totalCount')) {
    totalCount = await host.getService().count({
      where: args.where,
      context: queryCtx,
    } as never);
  }

  const limit = args.limit ?? finalItems.length;
  const hasMore = limit > 0 && finalItems.length === limit;

  return { items: finalItems, totalCount, hasMore };
}
