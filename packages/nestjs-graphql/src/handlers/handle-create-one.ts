import type { AnyHandlerHost, HandlerCallContext } from './handler-types';
import { buildOperationContext } from './handler-types';

export async function handleCreateOne(
  host: AnyHandlerHost,
  data: Record<string, unknown>,
  call: HandlerCallContext,
): Promise<unknown> {
  const { ctx, queryCtx } = buildOperationContext(host, call.gqlContext);

  const hooks = host.getHooks();
  let payload: Record<string, unknown> = data;
  const overridden = await hooks?.beforeCreate?.(payload as never, ctx as never);
  if (overridden && typeof overridden === 'object') payload = overridden as Record<string, unknown>;

  const created = await host.getService().create({ data: payload, context: queryCtx } as never);
  await hooks?.afterCreate?.(created as never, ctx as never);
  return created;
}
