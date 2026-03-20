import type { ValueType } from '../types';

// SQL expression type - matches drizzle-orm SQL shape at minimum
export interface SQLExpression {
  readonly queryChunks: unknown[];
}

export interface ComputedContext<TTable = unknown, TSchema = unknown, TContext = unknown> {
  table: TTable;
  schema: TSchema;
  sql: unknown;
  context: TContext;
}

export interface ComputedFieldDef {
  kind: 'computed';
  valueType: ValueType;
  resolve: (ctx: ComputedContext) => SQLExpression | unknown;
}

export function computed(config: {
  valueType: ValueType;
  resolve: (ctx: ComputedContext) => SQLExpression | unknown;
}): ComputedFieldDef {
  return {
    kind: 'computed',
    valueType: config.valueType,
    resolve: config.resolve,
  };
}
