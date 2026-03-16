import type { sql, Table } from 'drizzle-orm';
import { FieldType } from '@relayerjs/core';
import type { DerivedJoinContext, ValueType } from '@relayerjs/core';

export type SchemaTableKeys<TSchema> = {
  [K in keyof TSchema & string]: TSchema[K] extends Table ? K : never;
}[keyof TSchema & string];

export type ValueTypeToTS = {
  string: string;
  number: number;
  boolean: boolean;
  date: Date;
  json: unknown;
  array: unknown[];
  enum: string;
  object: Record<string, unknown>;
};

export interface DrizzleComputedContext<TTable, TSchema, TContext = unknown> {
  table: TTable;
  schema: TSchema;
  sql: typeof sql;
  context: TContext;
}

export interface DrizzleDerivedQueryContext<TDb, TSchema, TContext = unknown> {
  db: TDb;
  schema: TSchema;
  sql: typeof sql;
  context: TContext;
}

export interface TypedComputedDef<TTable, TSchema, TContext = unknown> {
  type: FieldType.Computed;
  valueType: ValueType;
  resolve: (ctx: DrizzleComputedContext<TTable, TSchema, TContext>) => unknown;
}

export interface TypedDerivedDef<TTable, TDb, TSchema, TContext = unknown> {
  type: FieldType.Derived;
  valueType: ValueType;
  query: (ctx: DrizzleDerivedQueryContext<TDb, TSchema, TContext>) => unknown;
  on: (ctx: DerivedJoinContext<TTable>) => unknown;
}

export type TypedFieldDef<TTable, TDb, TSchema, TContext = unknown> =
  | TypedComputedDef<TTable, TSchema, TContext>
  | TypedDerivedDef<TTable, TDb, TSchema, TContext>;

export type TypedEntitiesConfig<TDb, TSchema, TContext = unknown> = {
  [K in SchemaTableKeys<TSchema>]?: {
    fields?: Record<string, TypedFieldDef<TSchema[K], TDb, TSchema, TContext>>;
  };
};
