import type { RelationColumnDotPaths, TableColumnKeys } from './helpers';
import type { EntityWhere } from './where';

export type EntityAggregateGroupBy<
  TTable,
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> = (TableColumnKeys<TTable> | RelationColumnDotPaths<TTableName, TSchema>)[];

export interface EntityAggregateOptions<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> {
  where?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>;
  groupBy?: EntityAggregateGroupBy<TTable, TTableName, TSchema>;
  _count?: boolean;
  _sum?: Partial<Record<TableColumnKeys<TTable>, boolean>>;
  _avg?: Partial<Record<TableColumnKeys<TTable>, boolean>>;
  _min?: Partial<Record<TableColumnKeys<TTable>, boolean>>;
  _max?: Partial<Record<TableColumnKeys<TTable>, boolean>>;
}
