import { handleAggregate } from '../../handlers/handle-aggregate';
import type { AnyHandlerHost, HandlerCallContext } from '../../handlers/handler-types';
import type { EntityMetadata } from '../../metadata';
import type { RelayerBuilders } from '../../schema/builders';
import { defineMethod } from './method-utils';

export interface BuildAggregateMethodOptions {
  target: { prototype: object; name: string };
  entity: EntityMetadata;
  builders: RelayerBuilders;
  schemaName: string;
}

export function buildAggregateMethod(opts: BuildAggregateMethodOptions): void {
  const whereInput = opts.builders.whereInput.ensureClass(opts.entity);
  const aggregate = opts.builders.aggregate.ensureClasses(opts.entity);

  defineMethod({
    target: opts.target,
    methodName: `__relayer_aggregate_${opts.entity.name}`,
    schemaName: opts.schemaName,
    returnType: () => aggregate.result,
    args: [
      { name: 'where', type: () => whereInput },
      { name: 'groupBy', type: () => [String] },
      { name: '_count', type: () => Boolean },
      { name: '_sum', type: () => aggregate.sumInput },
      { name: '_avg', type: () => aggregate.avgInput },
      { name: '_min', type: () => aggregate.minInput },
      { name: '_max', type: () => aggregate.maxInput },
    ],
    handler: async function (
      this: AnyHandlerHost,
      where: Record<string, unknown> | undefined,
      groupBy: string[] | undefined,
      _count: boolean | undefined,
      _sum: Record<string, boolean> | undefined,
      _avg: Record<string, boolean> | undefined,
      _min: Record<string, boolean> | undefined,
      _max: Record<string, boolean> | undefined,
      info: unknown,
      gqlContext: unknown,
    ): Promise<unknown> {
      const call: HandlerCallContext = {
        info: info as HandlerCallContext['info'],
        gqlContext: gqlContext as HandlerCallContext['gqlContext'],
        entity: opts.entity,
      };
      return handleAggregate(this, { where, groupBy, _count, _sum, _avg, _min, _max }, call);
    },
  });
}
