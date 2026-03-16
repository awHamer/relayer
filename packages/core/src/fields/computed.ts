import type { ValueType } from '../types';

export interface ComputedContext<TTable = any, TSchema = any, TContext = unknown> {
  table: TTable;
  schema: TSchema;
  sql: any;
  context: TContext;
}

export interface ComputedFieldDef {
  kind: 'computed';
  valueType: ValueType;
  resolve: (ctx: ComputedContext) => unknown;
}

export function computed(config: {
  valueType: ValueType;
  resolve: (ctx: ComputedContext) => unknown;
}): ComputedFieldDef {
  return {
    kind: 'computed',
    valueType: config.valueType,
    resolve: config.resolve,
  };
}
