import type { ValueType } from '../types';

export interface DerivedQueryContext<TDb = any, TSchema = any, TContext = unknown> {
  db: TDb;
  schema: TSchema;
  sql: any;
  context: TContext;
  field: (subField?: string) => string;
}

export interface DerivedJoinContext<TTable = any> {
  parent: TTable;
  derived: Record<string, unknown>;
  eq: (a: unknown, b: unknown) => unknown;
}

export interface DerivedFieldDef {
  kind: 'derived';
  valueType: ValueType;
  query: (ctx: DerivedQueryContext) => unknown;
  on: (ctx: DerivedJoinContext) => unknown;
}

export function derived(config: {
  valueType: ValueType;
  query: (ctx: DerivedQueryContext) => unknown;
  on: (ctx: DerivedJoinContext) => unknown;
}): DerivedFieldDef {
  return {
    kind: 'derived',
    valueType: config.valueType,
    query: config.query,
    on: config.on,
  };
}
