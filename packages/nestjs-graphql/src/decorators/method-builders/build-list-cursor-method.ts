import { Int } from '@nestjs/graphql';

import { handleListCursor } from '../../handlers';
import type { AnyHandlerHost, HandlerCallContext } from '../../handlers';
import type { EntityMetadata } from '../../metadata';
import type { RelayerBuilders } from '../../schema/builders';
import { defineMethod } from './method-utils';

export interface BuildListCursorMethodOptions {
  target: { prototype: object; name: string };
  entity: EntityMetadata;
  builders: RelayerBuilders;
  schemaName: string;
}

export function buildListCursorMethod(opts: BuildListCursorMethodOptions): void {
  const whereInput = opts.builders.whereInput.ensureClass(opts.entity);
  const orderByInput = opts.builders.orderByInput.ensureClass(opts.entity);
  const cursorResult = opts.builders.cursorResult.ensureClass(opts.entity);

  defineMethod({
    target: opts.target,
    methodName: `__relayer_list_cursor_${opts.entity.name}`,
    schemaName: opts.schemaName,
    returnType: () => cursorResult,
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
      return handleListCursor(this, { where, orderBy, first, after }, call);
    },
  });
}
