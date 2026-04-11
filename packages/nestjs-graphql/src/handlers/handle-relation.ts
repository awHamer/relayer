import type { RelationId, RelationOperation } from '@relayerjs/nestjs-common';

import type { AnyHandlerHost, HandlerCallContext } from './handler-types';
import { buildOperationContext } from './handler-types';

export async function handleRelation(
  host: AnyHandlerHost,
  operation: RelationOperation,
  id: string | number,
  items: RelationId[],
  relationName: string,
  call: HandlerCallContext,
): Promise<{ success: boolean }> {
  const { ctx, queryCtx } = buildOperationContext(host, call.gqlContext);
  const idField = call.entity.getPrimaryKeyField()?.name ?? 'id';

  const hooks = host.getHooks();
  let payload = items;
  if (hooks?.beforeRelation) {
    const modified = await hooks.beforeRelation(operation, relationName as never, payload, ctx);
    if (modified) payload = modified as RelationId[];
  }

  await host.getService().update({
    where: { [idField]: id },
    data: { [relationName]: { [operation]: payload } },
    context: queryCtx,
  });

  if (hooks?.afterRelation) {
    await hooks.afterRelation(operation, relationName as never, payload, ctx);
  }

  return { success: true };
}
