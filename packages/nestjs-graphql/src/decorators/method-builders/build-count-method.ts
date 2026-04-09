import { Int } from '@nestjs/graphql';

import { handleCount } from '../../handlers/handle-count';
import type { AnyHandlerHost, HandlerCallContext } from '../../handlers/handler-types';
import type { EntityMetadata } from '../../metadata/entity-metadata';
import type { RelayerBuilders } from '../../schema/builders';
import { defineMethod } from './method-utils';

export interface BuildCountMethodOptions {
  target: { prototype: object; name: string };
  entity: EntityMetadata;
  builders: RelayerBuilders;
  schemaName: string;
}

export function buildCountMethod(opts: BuildCountMethodOptions): void {
  const whereInput = opts.builders.whereInput.ensureClass(opts.entity);

  defineMethod({
    target: opts.target,
    methodName: `__relayer_count_${opts.entity.name}`,
    schemaName: opts.schemaName,
    returnType: () => Int,
    args: [{ name: 'where', type: () => whereInput }],
    handler: async function (
      this: AnyHandlerHost,
      where: Record<string, unknown> | undefined,
      info: unknown,
      gqlContext: unknown,
    ): Promise<number> {
      const call: HandlerCallContext = {
        info: info as HandlerCallContext['info'],
        gqlContext: gqlContext as HandlerCallContext['gqlContext'],
        entity: opts.entity,
      };
      return handleCount(this, { where }, call);
    },
  });
}
