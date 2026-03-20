import type { ValueType } from '../types';
import type { SQLExpression } from './computed';

// Subquery builder - has .as() for aliasing
export interface SubqueryBuilder {
  as(name: string): unknown;
}

export interface DerivedQueryContext<TDb = unknown, TSchema = unknown, TContext = unknown> {
  db: TDb;
  schema: TSchema;
  sql: unknown;
  context: TContext;
  field: (subField?: string) => string;
}

export interface DerivedJoinContext<TTable = unknown> {
  parent: TTable;
  derived: Record<string, unknown>;
  eq: (a: unknown, b: unknown) => SQLExpression;
}

export interface DerivedFieldDef {
  kind: 'derived';
  valueType: ValueType;
  query: (ctx: DerivedQueryContext) => SubqueryBuilder;
  on: (ctx: DerivedJoinContext) => SQLExpression;
}

export function derived(config: {
  valueType: ValueType;
  query: (ctx: DerivedQueryContext) => SubqueryBuilder;
  on: (ctx: DerivedJoinContext) => SQLExpression;
}): DerivedFieldDef {
  return {
    kind: 'derived',
    valueType: config.valueType,
    query: config.query,
    on: config.on,
  };
}
