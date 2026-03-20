import type { RelayerEntityStatics } from '../entity/base';
import type { ComputedContext, ComputedFieldDef } from '../fields/computed';
import type { ObjectValueType } from '../types/value-types';

export interface ComputedConfig<TTable = unknown, TSchema = unknown, TContext = unknown> {
  resolve: (ctx: ComputedContext<TTable, TSchema, TContext>) => unknown;
}

export function Computed<TTable = unknown, TSchema = unknown, TContext = unknown>(
  config: ComputedConfig<TTable, TSchema, TContext>,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const ctor = target.constructor as unknown as RelayerEntityStatics;
    if (!ctor.__computed) return;

    const def: ComputedFieldDef = {
      kind: 'computed',
      valueType: 'unknown',
      resolve: config.resolve as ComputedFieldDef['resolve'],
    };
    ctor.__computed.set(String(propertyKey), def);
  };
}

export interface ComputedFieldType<TSchema = unknown, TEntityKey extends string = string> {
  resolve: (
    ctx: ComputedContext<TEntityKey extends keyof TSchema ? TSchema[TEntityKey] : unknown, TSchema>,
  ) => unknown;
}

export interface DerivedFieldType<TSchema = unknown, TEntityKey extends string = string> {
  shape?: ObjectValueType;
  query: (ctx: {
    db: unknown;
    schema: TSchema;
    sql: unknown;
    context: unknown;
    field: (subField?: string) => string;
  }) => unknown;
  on: (ctx: {
    parent: TEntityKey extends keyof TSchema ? TSchema[TEntityKey] : unknown;
    derived: Record<string, unknown>;
    eq: (a: unknown, b: unknown) => unknown;
  }) => unknown;
}
