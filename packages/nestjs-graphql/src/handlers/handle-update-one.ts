import { NotFoundException } from '@nestjs/common';

import type { AnyHandlerHost, HandlerCallContext } from './handler-types';
import { buildOperationContext } from './handler-types';

export async function handleUpdateOne(
  host: AnyHandlerHost,
  id: string | number,
  data: Record<string, unknown>,
  call: HandlerCallContext,
): Promise<unknown> {
  const { ctx, queryCtx } = buildOperationContext(host, call.gqlContext);
  const idField = call.entity.getPrimaryKeyField()?.name ?? 'id';
  const where = { [idField]: id };

  const hooks = host.getHooks();
  let payload = data;
  const overridden = await hooks?.beforeUpdate?.(payload as never, where as never, ctx as never);
  if (overridden && typeof overridden === 'object') payload = overridden as Record<string, unknown>;

  try {
    const updated = await host
      .getService()
      .update({ where, data: payload, context: queryCtx } as never);
    if (!updated) {
      throw new NotFoundException(`${call.entity.name} with ${idField}=${id} not found`);
    }
    await hooks?.afterUpdate?.(updated as never, ctx as never);
    return updated;
  } catch (err) {
    if (err instanceof NotFoundException) throw err;
    if (isExternalNotFoundError(err)) {
      throw new NotFoundException(`${call.entity.name} with ${idField}=${id} not found`);
    }
    throw err;
  }
}

// todo: think if message can have different text?
function isExternalNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const msg = (err as { message?: string }).message ?? '';
  return /not.?found/i.test(msg);
}
