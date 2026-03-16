import type { ExtractTablesWithRelations } from 'drizzle-orm';

import type { RelationTargetName, TableColumnKeys, TableRelationKeys } from './helpers';
import type { EntityWhere } from './where';

type RelationColumnDotPaths<
  TTableName extends string,
  TSchema extends Record<string, unknown>,
> = TTableName extends keyof ExtractTablesWithRelations<TSchema>
  ? {
      [K in TableRelationKeys<TTableName, TSchema>]: RelationTargetName<
        TTableName,
        TSchema,
        K
      > extends keyof TSchema
        ? `${K}.${TableColumnKeys<TSchema[RelationTargetName<TTableName, TSchema, K>]>}`
        : never;
    }[TableRelationKeys<TTableName, TSchema>]
  : never;

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
