import { Int } from '@nestjs/graphql';

import { handleListConnection } from '../../handlers/handle-list-connection';
import type { AnyHandlerHost, HandlerCallContext } from '../../handlers/handler-types';
import type { EntityMetadata } from '../../metadata/entity-metadata';
import type { RelayerBuilders } from '../../schema/builders';
import { defineMethod } from './method-utils';

export interface BuildListConnectionMethodOptions {
  target: { prototype: object; name: string };
  entity: EntityMetadata;
  builders: RelayerBuilders;
  schemaName: string;
}

export function buildListConnectionMethod(opts: BuildListConnectionMethodOptions): void {
  const whereInput = opts.builders.whereInput.ensureClass(opts.entity);
  const orderByInput = opts.builders.orderByInput.ensureClass(opts.entity);
  const { connection } = opts.builders.connection.ensureClasses(opts.entity);

  defineMethod({
    target: opts.target,
    methodName: `__relayer_list_connection_${opts.entity.name}`,
    schemaName: opts.schemaName,
    returnType: () => connection,
    args: [
      { name: 'where', type: () => whereInput },
      { name: 'orderBy', type: () => [orderByInput] },
      { name: 'first', type: () => Int },
      { name: 'after', type: () => String },
    ],
    handler: async function (
      this: AnyHandlerHost,
      where: Record<string, unknown> | undefined,
      orderBy: Record<string, unknown>[] | undefined,
      first: number | undefined,
      after: string | undefined,
      info: unknown,
      gqlContext: unknown,
    ): Promise<unknown> {
      const call: HandlerCallContext = {
        info: info as HandlerCallContext['info'],
        gqlContext: gqlContext as HandlerCallContext['gqlContext'],
        entity: opts.entity,
      };
      return handleListConnection(this, { where, orderBy, first, after }, call);
    },
  });
}
