import type { RelayerEntityStatics } from '../entity/base';
import type { DerivedFieldDef, DerivedJoinContext, DerivedQueryContext } from '../fields/derived';
import type { ObjectValueType } from '../types/value-types';

export interface DerivedConfig<
  TTable = unknown,
  TDb = unknown,
  TSchema = unknown,
  TContext = unknown,
> {
  shape?: ObjectValueType;
  query: (ctx: DerivedQueryContext<TDb, TSchema, TContext>) => unknown;
  on: (ctx: DerivedJoinContext<TTable>) => unknown;
}

export function Derived<TTable = unknown, TDb = unknown, TSchema = unknown, TContext = unknown>(
  config: DerivedConfig<TTable, TDb, TSchema, TContext>,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const ctor = target.constructor as unknown as RelayerEntityStatics;
    if (!ctor.__derived) return;

    const def: DerivedFieldDef = {
      kind: 'derived',
      valueType: config.shape ?? 'unknown',
      query: config.query as DerivedFieldDef['query'],
      on: config.on as DerivedFieldDef['on'],
    };
    ctor.__derived.set(String(propertyKey), def);
  };
}
