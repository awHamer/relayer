import { NotFoundException } from '@nestjs/common';

import { infoToRelayerSelect } from '../info/info-to-select';
import type { AnyHandlerHost, HandlerCallContext } from './handler-types';
import { buildOperationContext } from './handler-types';

export async function handleFindById(
  host: AnyHandlerHost,
  id: string | number,
  call: HandlerCallContext,
): Promise<unknown> {
  const { ctx, queryCtx } = buildOperationContext(host, call.gqlContext);
  const select = infoToRelayerSelect(call.info, call.entity);
  const idField = call.entity.getPrimaryKeyField()?.name ?? 'id';

  const options = {
    where: { [idField]: id },
    select,
    context: queryCtx,
  } as Parameters<ReturnType<AnyHandlerHost['getService']>['findFirst']>[0];

  const hooks = host.getHooks();
  await hooks?.beforeFindOne?.(options as never, ctx as never);

  const entity = await host.getService().findFirst(options);
  if (!entity) throw new NotFoundException(`${call.entity.name} with ${idField}=${id} not found`);

  const final = (await hooks?.afterFindOne?.(entity as never, ctx as never)) ?? entity;
  return final;
}
