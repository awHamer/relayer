import { handleCreateOne } from '../../handlers/handle-create-one';
import type { AnyHandlerHost, HandlerCallContext } from '../../handlers/handler-types';
import type { EntityMetadata } from '../../metadata';
import type { RelayerBuilders } from '../../schema/builders';
import { defineMethod } from './method-utils';

export interface BuildCreateOneMethodOptions {
  target: { prototype: object; name: string };
  entity: EntityMetadata;
  builders: RelayerBuilders;
  schemaName: string;
}

export function buildCreateOneMethod(opts: BuildCreateOneMethodOptions): void {
  const objectType = opts.builders.objectType.ensureClass(opts.entity);
  const createInput = opts.builders.createInput.ensureClass(opts.entity);

  defineMethod({
    target: opts.target,
    methodName: `__relayer_create_one_${opts.entity.name}`,
    schemaName: opts.schemaName,
    isMutation: true,
    returnType: () => objectType,
    args: [{ name: 'data', type: () => createInput, nullable: false }],
    handler: async function (
      this: AnyHandlerHost,
      data: Record<string, unknown>,
      info: unknown,
      gqlContext: unknown,
    ): Promise<unknown> {
      const call: HandlerCallContext = {
        info: info as HandlerCallContext['info'],
        gqlContext: gqlContext as HandlerCallContext['gqlContext'],
        entity: opts.entity,
      };
      return handleCreateOne(this, data, call);
    },
  });
}
