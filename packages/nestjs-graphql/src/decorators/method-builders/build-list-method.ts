import { Int } from '@nestjs/graphql';

import { handleList } from '../../handlers/handle-list';
import type { AnyHandlerHost, HandlerCallContext } from '../../handlers/handler-types';
import type { EntityMetadata } from '../../metadata/entity-metadata';
import type { RelayerBuilders } from '../../schema/builders';
import { defineMethod } from './method-utils';

export interface BuildListMethodOptions {
  target: { prototype: object; name: string };
  entity: EntityMetadata;
  builders: RelayerBuilders;
  schemaName: string;
}

export function buildListMethod(opts: BuildListMethodOptions): void {
  const whereInput = opts.builders.whereInput.ensureClass(opts.entity);
  const orderByInput = opts.builders.orderByInput.ensureClass(opts.entity);
  const listResult = opts.builders.listResult.ensureClass(opts.entity);

  defineMethod({
    target: opts.target,
    methodName: `__relayer_list_${opts.entity.name}`,
    schemaName: opts.schemaName,
    returnType: () => listResult,
    args: [
      { name: 'where', type: () => whereInput },
      { name: 'orderBy', type: () => [orderByInput] },
      { name: 'limit', type: () => Int },
      { name: 'offset', type: () => Int },
    ],
    handler: async function (
      this: AnyHandlerHost,
      where: Record<string, unknown> | undefined,
      orderBy: Record<string, unknown>[] | undefined,
      limit: number | undefined,
      offset: number | undefined,
      info: unknown,
      gqlContext: unknown,
    ): Promise<unknown> {
      const call: HandlerCallContext = {
        info: info as HandlerCallContext['info'],
        gqlContext: gqlContext as HandlerCallContext['gqlContext'],
        entity: opts.entity,
      };
      return handleList(this, { where, orderBy, limit, offset }, call);
    },
  });
}
