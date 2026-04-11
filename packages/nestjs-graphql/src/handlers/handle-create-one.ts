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
  const overridden = await hooks?.beforeCreate?.(payload, ctx);
  if (overridden && typeof overridden === 'object') payload = overridden as Record<string, unknown>;

  const created = await host.getService().create({ data: payload, context: queryCtx });
  await hooks?.afterCreate?.(created, ctx);
  return created;
}
