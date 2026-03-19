import type { EntityOrderByField } from './order-by';
import type { EntityWhere } from './where';

export type EntityAggregateGroupBy<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TEntities = {},
> = EntityOrderByField<TTable, TEntityConfig, TTableName, TSchema, TEntities>[];

// All fields reachable through dot paths — for aggregate functions that accept any field
type AggField<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TEntities = {},
> = EntityOrderByField<TTable, TEntityConfig, TTableName, TSchema, TEntities>;

export interface EntityAggregateOptions<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TEntities = {},
> {
  where?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema, TEntities>;
  groupBy?: EntityAggregateGroupBy<TTable, TEntityConfig, TTableName, TSchema, TEntities>;
  _count?: boolean;
  _sum?: Partial<Record<AggField<TTable, TEntityConfig, TTableName, TSchema, TEntities>, boolean>>;
  _avg?: Partial<Record<AggField<TTable, TEntityConfig, TTableName, TSchema, TEntities>, boolean>>;
  _min?: Partial<Record<AggField<TTable, TEntityConfig, TTableName, TSchema, TEntities>, boolean>>;
  _max?: Partial<Record<AggField<TTable, TEntityConfig, TTableName, TSchema, TEntities>, boolean>>;
}
