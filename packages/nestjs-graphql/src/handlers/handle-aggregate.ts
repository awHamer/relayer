import type { AnyHandlerHost, HandlerCallContext } from './handler-types';
import { buildOperationContext } from './handler-types';

export interface AggregateArgs {
  where?: Record<string, unknown>;
  groupBy?: string[];
  _count?: boolean;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
  having?: Record<string, unknown>;
}

export async function handleAggregate(
  host: AnyHandlerHost,
  args: AggregateArgs,
  call: HandlerCallContext,
): Promise<{ data: unknown }> {
  const { ctx, queryCtx } = buildOperationContext(host, call.gqlContext);

  const options = {
    where: args.where,
    groupBy: args.groupBy,
    _count: args._count,
    _sum: args._sum,
    _avg: args._avg,
    _min: args._min,
    _max: args._max,
    having: args.having,
    context: queryCtx,
  } as Parameters<ReturnType<AnyHandlerHost['getService']>['aggregate']>[0];

  const hooks = host.getHooks();
  await hooks?.beforeAggregate?.(options as never, ctx as never);

  const data = await host.getService().aggregate(options);
  const final = (await hooks?.afterAggregate?.(data as never, ctx as never)) ?? data;
  return { data: final };
}
