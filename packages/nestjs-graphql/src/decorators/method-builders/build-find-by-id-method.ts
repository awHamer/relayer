import { ID } from '@nestjs/graphql';

import { handleFindById } from '../../handlers/handle-find-by-id';
import type { AnyHandlerHost, HandlerCallContext } from '../../handlers/handler-types';
import type { EntityMetadata } from '../../metadata';
import type { RelayerBuilders } from '../../schema/builders';
import { defineMethod } from './method-utils';

export interface BuildFindByIdMethodOptions {
  target: { prototype: object; name: string };
  entity: EntityMetadata;
  builders: RelayerBuilders;
  schemaName: string;
}

export function buildFindByIdMethod(opts: BuildFindByIdMethodOptions): void {
  const objectType = opts.builders.objectType.ensureClass(opts.entity);

  defineMethod({
    target: opts.target,
    methodName: `__relayer_find_by_id_${opts.entity.name}`,
    schemaName: opts.schemaName,
    returnType: () => objectType,
    nullable: true,
    args: [{ name: 'id', type: () => ID, nullable: false }],
    handler: async function (
      this: AnyHandlerHost,
      id: string | number,
      info: unknown,
      gqlContext: unknown,
    ): Promise<unknown> {
      const call: HandlerCallContext = {
        info: info as HandlerCallContext['info'],
        gqlContext: gqlContext as HandlerCallContext['gqlContext'],
        entity: opts.entity,
      };
      return handleFindById(this, id, call);
    },
  });
}
