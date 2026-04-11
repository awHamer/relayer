import type { AnyHandlerHost, HandlerCallContext } from './handler-types';
import { buildOperationContext } from './handler-types';

export async function handleCount(
  host: AnyHandlerHost,
  args: { where?: Record<string, unknown> },
  call: HandlerCallContext,
): Promise<number> {
  const { ctx, queryCtx } = buildOperationContext(host, call.gqlContext);
  const options = { where: args.where, context: queryCtx } as Parameters<
    ReturnType<AnyHandlerHost['getService']>['count']
  >[0];

  const hooks = host.getHooks();
  await hooks?.beforeCount?.(options!, ctx);

  return host.getService().count(options);
}
