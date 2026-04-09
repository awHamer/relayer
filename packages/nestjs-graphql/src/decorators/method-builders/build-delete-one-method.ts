import { ID } from '@nestjs/graphql';

import { handleDeleteOne } from '../../handlers/handle-delete-one';
import type { AnyHandlerHost, HandlerCallContext } from '../../handlers/handler-types';
import type { EntityMetadata } from '../../metadata/entity-metadata';
import type { RelayerBuilders } from '../../schema/builders';
import { defineMethod } from './method-utils';

export interface BuildDeleteOneMethodOptions {
  target: { prototype: object; name: string };
  entity: EntityMetadata;
  builders: RelayerBuilders;
  schemaName: string;
}

export function buildDeleteOneMethod(opts: BuildDeleteOneMethodOptions): void {
  const objectType = opts.builders.objectType.ensureClass(opts.entity);

  defineMethod({
    target: opts.target,
    methodName: `__relayer_delete_one_${opts.entity.name}`,
    schemaName: opts.schemaName,
    isMutation: true,
    returnType: () => objectType,
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
      return handleDeleteOne(this, id, call);
    },
  });
}
