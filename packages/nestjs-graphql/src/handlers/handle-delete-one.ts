import { NotFoundException } from '@nestjs/common';

import type { AnyHandlerHost, HandlerCallContext } from './handler-types';
import { buildOperationContext } from './handler-types';

export async function handleDeleteOne(
  host: AnyHandlerHost,
  id: string | number,
  call: HandlerCallContext,
): Promise<unknown> {
  const { ctx, queryCtx } = buildOperationContext(host, call.gqlContext);
  const idField = call.entity.getPrimaryKeyField()?.name ?? 'id';
  const where = { [idField]: id };

  const hooks = host.getHooks();
  await hooks?.beforeDelete?.(where, ctx);

  try {
    const deleted = await host.getService().delete({ where, context: queryCtx });
    if (!deleted) {
      throw new NotFoundException(`${call.entity.name} with ${idField}=${id} not found`);
    }
    await hooks?.afterDelete?.(deleted, ctx);
    return deleted;
  } catch (err) {
    if (err instanceof NotFoundException) throw err;
    if (isNotFoundError(err)) {
      throw new NotFoundException(`${call.entity.name} with ${idField}=${id} not found`);
    }
    throw err;
  }
}

function isNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const msg = (err as { message?: string }).message ?? '';
  return /not.?found/i.test(msg);
}
