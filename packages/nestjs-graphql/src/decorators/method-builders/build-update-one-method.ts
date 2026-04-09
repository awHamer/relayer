import { ID } from '@nestjs/graphql';

import { handleUpdateOne } from '../../handlers/handle-update-one';
import type { AnyHandlerHost, HandlerCallContext } from '../../handlers/handler-types';
import type { EntityMetadata } from '../../metadata/entity-metadata';
import type { RelayerBuilders } from '../../schema/builders';
import { defineMethod } from './method-utils';

export interface BuildUpdateOneMethodOptions {
  target: { prototype: object; name: string };
  entity: EntityMetadata;
  builders: RelayerBuilders;
  schemaName: string;
}

export function buildUpdateOneMethod(opts: BuildUpdateOneMethodOptions): void {
  const objectType = opts.builders.objectType.ensureClass(opts.entity);
  const updateInput = opts.builders.updateInput.ensureClass(opts.entity);

  defineMethod({
    target: opts.target,
    methodName: `__relayer_update_one_${opts.entity.name}`,
    schemaName: opts.schemaName,
    isMutation: true,
    returnType: () => objectType,
    args: [
      { name: 'id', type: () => ID, nullable: false },
      { name: 'data', type: () => updateInput, nullable: false },
    ],
    handler: async function (
      this: AnyHandlerHost,
      id: string | number,
      data: Record<string, unknown>,
      info: unknown,
      gqlContext: unknown,
    ): Promise<unknown> {
      const call: HandlerCallContext = {
        info: info as HandlerCallContext['info'],
        gqlContext: gqlContext as HandlerCallContext['gqlContext'],
        entity: opts.entity,
      };
      return handleUpdateOne(this, id, data, call);
    },
  });
}
